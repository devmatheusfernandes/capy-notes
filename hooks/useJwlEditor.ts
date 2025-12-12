"use client";

import { useState } from "react";
import JSZip from "jszip";
import type { Database } from "sql.js";
import CryptoJS from "crypto-js";
import { saveAs } from "file-saver";

export type Note = {
  NoteId: number;
  Title: string | null;
  Content: string | null;
  LastModified: string;
};

// Configuração das Tabelas e suas relações (Ordem importa!)
const TABLES_CONFIG = [
  { name: "Location", pk: "LocationId", fks: [] },
  { name: "Tag", pk: "TagId", fks: [] },
  { name: "UserMark", pk: "UserMarkId", fks: [{ col: "LocationId", ref: "Location" }] },
  { name: "BlockRange", pk: "BlockRangeId", fks: [{ col: "UserMarkId", ref: "UserMark" }] },
  { name: "Note", pk: "NoteId", fks: [{ col: "UserMarkId", ref: "UserMark" }, { col: "LocationId", ref: "Location" }] },
  { name: "Bookmark", pk: "BookmarkId", fks: [{ col: "LocationId", ref: "Location" }] },
  { name: "TagMap", pk: "TagMapId", fks: [{ col: "TagId", ref: "Tag" }, { col: "NoteId", ref: "Note" }, { col: "LocationId", ref: "Location" }] },
];

export const useJwlEditor = () => {
  const [sqlDb, setSqlDb] = useState<Database | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [originalZip, setOriginalZip] = useState<JSZip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // --- 1. Carregar Backup Principal ---
  const loadFile = async (fileOrBlob: File | Blob) => {
    setIsLoading(true);
    setSqlDb(null);
    setNotes([]);

    try {
      const initSqlJs = (await import("sql.js")).default;
      const zip = await JSZip.loadAsync(fileOrBlob);
      setOriginalZip(zip);

      const manifestStr = await zip.file("manifest.json")?.async("string");
      if (!manifestStr) throw new Error("Manifesto inválido");
      setManifest(JSON.parse(manifestStr));

      const dbName = JSON.parse(manifestStr).userDataBackup.databaseName || "userData.db";
      const dbData = await zip.file(dbName)?.async("uint8array");

      if (dbData) {
        const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
        const db = new SQL.Database(dbData);
        setSqlDb(db);
        refreshNotes(db);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
      alert("Erro ao carregar o arquivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotes = (db: Database) => {
    try {
      const stmt = db.prepare(`SELECT NoteId, Title, Content, LastModified FROM Note ORDER BY LastModified DESC`);
      const results: Note[] = [];
      while (stmt.step()) results.push(stmt.getAsObject() as unknown as Note);
      stmt.free();
      setNotes(results);
    } catch (e) { console.error(e); }
  };

  const updateNote = (id: number, content: string, title?: string) => {
    if (!sqlDb) return;
    const now = new Date().toISOString().replace("Z", "");
    sqlDb.run("UPDATE Note SET Content = ?, Title = ?, LastModified = ? WHERE NoteId = ?", [content, title || null, now, id]);
    refreshNotes(sqlDb);
  };

  // --- 2. Lógica de MERGE (Fusão) ---
  const mergeBackup = async (fileToMerge: File) => {
    if (!sqlDb || !originalZip) {
      alert("Carregue um backup principal primeiro.");
      return;
    }

    setIsMerging(true);
    try {
      const initSqlJs = (await import("sql.js")).default;
      const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });

      // A. Ler o Backup Secundário (Source)
      const sourceZip = await JSZip.loadAsync(fileToMerge);
      const sourceManifest = JSON.parse(await sourceZip.file("manifest.json")?.async("string") || "{}");
      const sourceDbName = sourceManifest.userDataBackup?.databaseName || "userData.db";
      const sourceDbData = await sourceZip.file(sourceDbName)?.async("uint8array");

      if (!sourceDbData) throw new Error("DB do arquivo secundário não encontrado");

      const sourceDb = new SQL.Database(sourceDbData);

      // B. Mapeamento de IDs Antigos -> Novos
      // Ex: { Note: { 1: 501, 2: 502 }, Tag: { 5: 20 } }
      const idMappings: Record<string, Record<number, number>> = {};

      // Executar transação no DB Principal (Destination)
      sqlDb.run("BEGIN TRANSACTION");

      for (const table of TABLES_CONFIG) {
        idMappings[table.name] = {};

        // 1. Descobrir o "Piso" (Max ID) atual no DB Principal
        const res = sqlDb.exec(`SELECT MAX(${table.pk}) as maxId FROM ${table.name}`);
        const currentMaxId = res[0]?.values[0][0] as number || 0;
        const offset = currentMaxId + 1000; // Margem de segurança

        // 2. Ler dados do DB Secundário
        const srcRows = [];
        try {
          const stmt = sourceDb.prepare(`SELECT * FROM ${table.name}`);
          while (stmt.step()) srcRows.push(stmt.getAsObject());
          stmt.free();
        } catch (e) {
          console.warn(`Tabela ${table.name} ignorada (não existe no secundário).`);
          continue;
        }

        // 3. Processar cada linha
        for (const row of srcRows) {
          const oldId = row[table.pk] as number;
          const newId = oldId + offset; // Gerar novo ID único
          
          idMappings[table.name][oldId] = newId; // Salvar no mapa
          row[table.pk] = newId; // Atualizar PK na linha

          // 4. Atualizar Foreign Keys (se houver)
          // Ex: Se estamos inserindo uma Note, precisamos atualizar seu UserMarkId com base no mapeamento feito anteriormente
          for (const fk of table.fks) {
            const oldFkValue = row[fk.col] as number;
            if (oldFkValue && idMappings[fk.ref] && idMappings[fk.ref][oldFkValue]) {
              row[fk.col] = idMappings[fk.ref][oldFkValue];
            } else if (oldFkValue) {
               // Se não achou o pai mapeado, define NULL para evitar crash de integridade, 
               // ou mantém o original se for Location (arriscado, mas location costuma ser estático)
               // Para segurança neste script simples: mantemos se não mapeado.
            }
          }

          // 5. Inserir no DB Principal
          const cols = Object.keys(row).join(", ");
          const placeholders = Object.keys(row).map(() => "?").join(", ");
          const values = Object.values(row);
          
          sqlDb.run(`INSERT OR IGNORE INTO ${table.name} (${cols}) VALUES (${placeholders})`, values);
        }
      }

      sqlDb.run("COMMIT");
      
      // C. Copiar arquivos de mídia do ZIP Secundário para o Principal
      const promises: Promise<void>[] = [];
      sourceZip.forEach((relativePath, file) => {
        // Ignora DB e Manifesto, pega só imagens/json extras
        if (relativePath !== sourceDbName && relativePath !== "manifest.json") {
           // Se o arquivo não existir no original, adiciona
           if (!originalZip.file(relativePath)) {
              promises.push(
                file.async("uint8array").then(content => {
                  originalZip.file(relativePath, content);
                })
              );
           }
        }
      });
      await Promise.all(promises);

      alert(`Merge concluído com sucesso! ${sourceRowsCount(idMappings)} itens adicionados.`);
      refreshNotes(sqlDb); // Atualiza a tabela na tela

    } catch (error) {
      console.error(error);
      if (sqlDb) sqlDb.run("ROLLBACK");
      alert("Erro ao realizar o merge. Verifique o console.");
    } finally {
      setIsMerging(false);
    }
  };

  const sourceRowsCount = (map: any) => {
      return Object.keys(map["Note"] || {}).length;
  }

  // --- 3. Gerar Arquivo Final ---
  const generateUpdatedBlob = async (): Promise<Blob | null> => {
    if (!sqlDb || !manifest || !originalZip) return null;
    const newZip = new JSZip();
    const dbName = manifest.userDataBackup.databaseName;

    // Copiar arquivos do original (que agora contêm os do secundário também)
    const promises: Promise<void>[] = [];
    originalZip.forEach((relativePath, file) => {
      if (relativePath !== dbName && relativePath !== "manifest.json") {
        promises.push(file.async("uint8array").then((c) => { newZip.file(relativePath, c); }));
      }
    });
    await Promise.all(promises);

    const dbData = sqlDb.export();
    newZip.file(dbName, dbData);

    const dbWordArray = CryptoJS.lib.WordArray.create(dbData as any);
    const hash = CryptoJS.SHA256(dbWordArray).toString();

    const newManifest = {
      ...manifest,
      userDataBackup: { ...manifest.userDataBackup, hash, lastModifiedDate: new Date().toISOString() },
    };
    newZip.file("manifest.json", JSON.stringify(newManifest));

    return await newZip.generateAsync({ type: "blob" });
  };

  return { loadFile, notes, updateNote, generateUpdatedBlob, mergeBackup, isLoading, isMerging, hasLoaded: !!sqlDb };
};
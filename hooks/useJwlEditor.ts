"use client";

import { useState } from "react";
import JSZip from "jszip";
import type { Database } from "sql.js";
import CryptoJS from "crypto-js";

export type Note = {
  NoteId: number;
  Title: string | null;
  Content: string | null;
  LastModified: string;
  ColorIndex: number;
  Tags: string[];
  LocationId?: number;
  UserMarkId?: number;
  BlockType?: number;
};

export type Tag = {
  TagId: number;
  Name: string;
};

// Configuração das tabelas para o Merge
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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [originalZip, setOriginalZip] = useState<JSZip | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // --- 1. CARREGAR BACKUP ---
  const loadFile = async (fileOrBlob: File | Blob) => {
    setIsLoading(true);
    setSqlDb(null);
    setNotes([]);
    setAllTags([]);

    try {
      const initSqlJs = (await import("sql.js")).default;
      const zip = await JSZip.loadAsync(fileOrBlob);
      setOriginalZip(zip);

      const manifestStr = await zip.file("manifest.json")?.async("string");
      if (!manifestStr) throw new Error("Manifesto inválido");
      const manifestJson = JSON.parse(manifestStr);
      setManifest(manifestJson);

      const dbName = manifestJson.userDataBackup.databaseName || "userData.db";
      const dbData = await zip.file(dbName)?.async("uint8array");

      if (dbData) {
        const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
        const db = new SQL.Database(dbData);
        setSqlDb(db);
        refreshNotes(db);
        refreshTags(db);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. LER DADOS ---
  const refreshNotes = (db: Database) => {
    try {
      // Query otimizada com subselect ordenado pela posição da tag
      const stmt = db.prepare(`
        SELECT 
          n.NoteId, n.Title, n.Content, n.LastModified, n.LocationId, n.UserMarkId, n.BlockType, u.ColorIndex, 
          (SELECT GROUP_CONCAT(t.Name, '|') 
           FROM TagMap tm 
           JOIN Tag t ON tm.TagId = t.TagId 
           WHERE tm.NoteId = n.NoteId
           ORDER BY tm.Position ASC) as TagString
        FROM Note n 
        LEFT JOIN UserMark u ON n.UserMarkId = u.UserMarkId
        ORDER BY n.LastModified DESC
      `);
      
      const results: Note[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
          ...row,
          ColorIndex: row.ColorIndex === null ? 0 : row.ColorIndex,
          Tags: row.TagString ? (row.TagString as string).split('|') : []
        } as unknown as Note);
      }
      stmt.free();
      setNotes(results);
    } catch (e) { console.error(e); }
  };

  const refreshTags = (db: Database) => {
    try {
      const stmt = db.prepare("SELECT TagId, Name FROM Tag ORDER BY Name ASC");
      const tags: Tag[] = [];
      while (stmt.step()) tags.push(stmt.getAsObject() as unknown as Tag);
      stmt.free();
      setAllTags(tags);
    } catch (e) { console.error(e); }
  };

  // Helper para UUID
  const generateUUID = () => {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (+c / 4)).toString(16)
    );
  };

// --- 3. CRIAR NOTA (CORRIGIDO - SEM USERMARK) ---
  const createNote = (title: string, content: string, colorIndex: number, tags: string[]) => {
    if (!sqlDb) return;
    const now = new Date().toISOString().replace("Z", "");
    const noteGuid = generateUUID();
    // const userMarkGuid = generateUUID(); // Não usamos mais UserMark para notas soltas

    try {
      sqlDb.run("BEGIN TRANSACTION");

      // OBS: Removemos a criação de UserMark aqui. 
      // O banco exige um LocationId para criar um UserMark (Cor), 
      // mas notas novas soltas não têm LocationId.
      
      // 1. Criar Nota (UserMarkId e LocationId ficam como NULL)
      sqlDb.run(
        `INSERT INTO Note (Guid, UserMarkId, LocationId, Title, Content, LastModified, Created, BlockType) 
         VALUES (?, NULL, NULL, ?, ?, ?, ?, 0)`,
        [noteGuid, title || null, content, now, now]
      );
      
      // Pega o ID da nota criada
      const noteIdRes = sqlDb.exec("SELECT last_insert_rowid()");
      const noteId = noteIdRes[0].values[0][0];

      // 2. Inserir Tags
      tags.map(t => t.trim()).filter(Boolean).forEach((cleanTag) => {
        let tagId;
        
        // A. Pega ou cria a Tag
        const tagRes = sqlDb.exec("SELECT TagId FROM Tag WHERE Name = ?", [cleanTag]);
        if (tagRes.length > 0 && tagRes[0].values.length > 0) {
           tagId = tagRes[0].values[0][0];
        } else {
           sqlDb.run("INSERT INTO Tag (Type, Name) VALUES (1, ?)", [cleanTag]);
           tagId = sqlDb.exec("SELECT last_insert_rowid()")[0].values[0][0];
        }

        // B. Calcula a próxima posição disponível
        const posRes = sqlDb.exec("SELECT MAX(Position) FROM TagMap WHERE TagId = ?", [tagId]);
        let nextPosition = 0;
        if (posRes.length > 0 && posRes[0].values[0][0] !== null) {
            nextPosition = (posRes[0].values[0][0] as number) + 1;
        }

        // C. Insere com a posição calculada
        sqlDb.run("INSERT INTO TagMap (TagId, NoteId, Position) VALUES (?, ?, ?)", [tagId, noteId, nextPosition]);
      });

      sqlDb.run("COMMIT");
      refreshNotes(sqlDb);
      refreshTags(sqlDb);
    } catch (error) {
      sqlDb.run("ROLLBACK");
      console.error("Erro ao criar nota:", error);
      throw error;
    }
  };

  // --- 4. ATUALIZAR NOTA (CORRIGIDO) ---
  const updateNote = (id: number, content: string, title: string, colorIndex: number, tags: string[]) => {
    if (!sqlDb) return;
    const now = new Date().toISOString().replace("Z", "");
    try {
      sqlDb.run("BEGIN TRANSACTION");
      
      sqlDb.run("UPDATE Note SET Content = ?, Title = ?, LastModified = ? WHERE NoteId = ?", [content, title || null, now, id]);
      
      // Atualiza cor
      sqlDb.run("UPDATE UserMark SET ColorIndex = ? WHERE UserMarkId = (SELECT UserMarkId FROM Note WHERE NoteId = ?)", [colorIndex, id]);
      
      // Remove vínculos antigos de tag desta nota
      sqlDb.run("DELETE FROM TagMap WHERE NoteId = ?", [id]);
      
      // Insere novas tags (CORRIGIDO: Calcula próxima posição livre)
      tags.map(t => t.trim()).filter(Boolean).forEach((cleanTag) => {
        let tagId;
        
        // A. Pega ou cria a Tag
        const tagRes = sqlDb.exec("SELECT TagId FROM Tag WHERE Name = ?", [cleanTag]);
        if (tagRes.length > 0 && tagRes[0].values.length > 0) {
           tagId = tagRes[0].values[0][0];
        } else {
           sqlDb.run("INSERT INTO Tag (Type, Name) VALUES (1, ?)", [cleanTag]);
           tagId = sqlDb.exec("SELECT last_insert_rowid()")[0].values[0][0];
        }

        // B. Calcula a próxima posição disponível
        const posRes = sqlDb.exec("SELECT MAX(Position) FROM TagMap WHERE TagId = ?", [tagId]);
        let nextPosition = 0;
        if (posRes.length > 0 && posRes[0].values[0][0] !== null) {
            nextPosition = (posRes[0].values[0][0] as number) + 1;
        }

        // C. Insere
        sqlDb.run("INSERT INTO TagMap (TagId, NoteId, Position) VALUES (?, ?, ?)", [tagId, id, nextPosition]);
      });

      sqlDb.run("COMMIT");
      refreshNotes(sqlDb);
      refreshTags(sqlDb);
    } catch (error) {
      sqlDb.run("ROLLBACK");
      throw error;
    }
  };

  // --- 5. DELETAR NOTA ---
  const deleteNote = (noteId: number) => {
    if (!sqlDb) return;
    try {
      sqlDb.run("BEGIN TRANSACTION");
      const res = sqlDb.exec("SELECT UserMarkId FROM Note WHERE NoteId = ?", [noteId]);
      const userMarkId = res.length > 0 && res[0].values.length > 0 ? res[0].values[0][0] : null;

      sqlDb.run("DELETE FROM TagMap WHERE NoteId = ?", [noteId]);
      sqlDb.run("DELETE FROM Note WHERE NoteId = ?", [noteId]);
      
      if (userMarkId) {
        sqlDb.run("DELETE FROM UserMark WHERE UserMarkId = ?", [userMarkId]);
        sqlDb.run("DELETE FROM BlockRange WHERE UserMarkId = ?", [userMarkId]);
      }

      sqlDb.run("COMMIT");
      refreshNotes(sqlDb);
    } catch (error) {
      sqlDb.run("ROLLBACK");
      throw error;
    }
  };

  // --- 6. GERENCIAR TAGS ---
  const renameTag = (tagId: number, newName: string) => {
    if (!sqlDb) return;
    sqlDb.run("UPDATE Tag SET Name = ? WHERE TagId = ?", [newName, tagId]);
    refreshTags(sqlDb);
    refreshNotes(sqlDb);
  };

  const deleteTag = (tagId: number) => {
    if (!sqlDb) return;
    try {
      sqlDb.run("BEGIN TRANSACTION");
      sqlDb.run("DELETE FROM TagMap WHERE TagId = ?", [tagId]);
      sqlDb.run("DELETE FROM Tag WHERE TagId = ?", [tagId]);
      sqlDb.run("COMMIT");
      refreshTags(sqlDb);
      refreshNotes(sqlDb);
    } catch (e) {
      sqlDb.run("ROLLBACK");
      throw e;
    }
  };

  // --- 7. MERGE BACKUP ---
  const mergeBackup = async (fileToMerge: File) => {
    if (!sqlDb || !originalZip) throw new Error("Sem backup base.");
    setIsMerging(true);
    try {
      const initSqlJs = (await import("sql.js")).default;
      const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });

      const sourceZip = await JSZip.loadAsync(fileToMerge);
      const sourceManifest = JSON.parse(await sourceZip.file("manifest.json")?.async("string") || "{}");
      const sourceDbName = sourceManifest.userDataBackup?.databaseName || "userData.db";
      const sourceDbData = await sourceZip.file(sourceDbName)?.async("uint8array");
      if (!sourceDbData) throw new Error("DB secundário não encontrado.");
      const sourceDb = new SQL.Database(sourceDbData);

      const idMappings: Record<string, Record<number, number>> = {};

      sqlDb.run("BEGIN TRANSACTION");

      for (const table of TABLES_CONFIG) {
        idMappings[table.name] = {};
        const res = sqlDb.exec(`SELECT MAX(${table.pk}) FROM ${table.name}`);
        const currentMax = (res[0]?.values[0][0] as number) || 0;
        const offset = currentMax + 1000;

        const rows = [];
        try {
          const stmt = sourceDb.prepare(`SELECT * FROM ${table.name}`);
          while(stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
        } catch(e) { continue; }

        for (const row of rows) {
          const oldId = row[table.pk] as number;
          const newId = oldId + offset;
          idMappings[table.name][oldId] = newId;
          row[table.pk] = newId;

          for (const fk of table.fks) {
            const oldRef = row[fk.col] as number;
            if (oldRef && idMappings[fk.ref]?.[oldRef]) {
              row[fk.col] = idMappings[fk.ref][oldRef];
            }
          }
          const cols = Object.keys(row).join(", ");
          const placeholders = Object.keys(row).map(() => "?").join(", ");
          sqlDb.run(`INSERT OR IGNORE INTO ${table.name} (${cols}) VALUES (${placeholders})`, Object.values(row));
        }
      }
      sqlDb.run("COMMIT");

      // Copiar arquivos
      const promises: Promise<void>[] = [];
      sourceZip.forEach((relativePath, file) => {
        if (relativePath !== sourceDbName && relativePath !== "manifest.json") {
           if (!originalZip.file(relativePath)) {
              promises.push(file.async("uint8array").then(c => { originalZip.file(relativePath, c); }));
           }
        }
      });
      await Promise.all(promises);
      
      refreshNotes(sqlDb);
      refreshTags(sqlDb);
    } catch (error) {
      if (sqlDb) sqlDb.run("ROLLBACK");
      console.error(error);
      throw error;
    } finally {
      setIsMerging(false);
    }
  };

  // --- 8. EXPORTAR ---
  const generateUpdatedBlob = async (): Promise<Blob | null> => {
    if (!sqlDb || !manifest || !originalZip) return null;
    const newZip = new JSZip();
    const dbName = manifest.userDataBackup.databaseName;

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
    
    const newManifest = { ...manifest, userDataBackup: { ...manifest.userDataBackup, hash, lastModifiedDate: new Date().toISOString() } };
    newZip.file("manifest.json", JSON.stringify(newManifest));

    return await newZip.generateAsync({ type: "blob" });
  };

  return {
    loadFile, notes, allTags,
    createNote, updateNote, deleteNote, 
    renameTag, deleteTag,
    mergeBackup, generateUpdatedBlob,
    isLoading, isMerging, hasLoaded: !!sqlDb
  };
};
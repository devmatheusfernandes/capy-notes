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

export const useJwlEditor = () => {
  const [sqlDb, setSqlDb] = useState<Database | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [originalZip, setOriginalZip] = useState<JSZip | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Aceita File (upload manual) ou Blob (vindo do Firebase)
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

  // Gera o arquivo final para download ou upload
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

    const newManifest = {
      ...manifest,
      userDataBackup: { ...manifest.userDataBackup, hash, lastModifiedDate: new Date().toISOString() },
    };
    newZip.file("manifest.json", JSON.stringify(newManifest));

    return await newZip.generateAsync({ type: "blob" });
  };

  return { loadFile, notes, updateNote, generateUpdatedBlob, isLoading, hasLoaded: !!sqlDb };
};
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

export const runtime = "nodejs";

function openDb(version?: string) {
  const dbDir = path.join(process.cwd(), "bible", "db");
  const filename = version ? `${version}.sqlite` : "nwt-pt.sqlite";
  const sqlitePath = path.join(dbDir, filename);
  
  if (!fs.existsSync(sqlitePath)) return null;
  return new Database(sqlitePath, { readonly: true });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const version = url.searchParams.get("version");
    
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "Parâmetro 'q' é obrigatório" }, { status: 400 });
    }

    const db = openDb(version || undefined);
    if (!db) {
      return NextResponse.json({ error: "Banco SQLite não encontrado" }, { status: 500 });
    }

    // Detect Schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    const isLegacy = tableNames.includes('verses');
    
    let bookTable = 'book';
    let verseTable = 'verse';
    
    if (!isLegacy) {
      if (tableNames.includes('book') && tableNames.includes('verse')) {
         bookTable = 'book';
         verseTable = 'verse';
      } else {
         // Try to find *_books and *_verses
         bookTable = tableNames.find(n => n.endsWith('_books')) || 'book';
         verseTable = tableNames.find(n => n.endsWith('_verses')) || 'verse';
      }
    }

    let results: Array<{
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }> = [];

    if (isLegacy) {
      const stmt = db.prepare(
        `SELECT book, chapter, verse, text
         FROM verses
         WHERE text LIKE ?
         ORDER BY book, chapter, verse
         LIMIT 50`
      );
      results = stmt.all(`%${q}%`) as any;
    } else {
      const stmt = db.prepare(
        `SELECT b.name as book, v.chapter, v.verse, v.text
         FROM ${verseTable} v
         JOIN ${bookTable} b ON v.book_id = b.id
         WHERE v.text LIKE ?
         ORDER BY b.id, v.chapter, v.verse
         LIMIT 50`
      );
      results = stmt.all(`%${q}%`) as any;
    }

    return NextResponse.json({ q, results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha na busca" }, { status: 500 });
  }
}

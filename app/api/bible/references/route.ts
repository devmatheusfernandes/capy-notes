import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

export const runtime = "nodejs";

const BOOKS = [
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", 
  "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", 
  "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cântico de Salomão", "Isaías", "Jeremias", "Lamentações", 
  "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", 
  "Sofonias", "Ageu", "Zacarias", "Malaquias",
  "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", 
  "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", 
  "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", 
  "3 João", "Judas", "Apocalipse"
];

// Map alternative names if necessary (e.g. Cânticos -> Cântico de Salomão)
const BOOK_MAP: Record<string, string> = {
  "Cânticos": "Cântico de Salomão",
  "Cantares": "Cântico de Salomão",
  "Revelação": "Apocalipse",
  "Atos dos Apóstolos": "Atos"
};

function getBookId(bookName: string): number {
  const normalized = BOOK_MAP[bookName] || bookName;
  const index = BOOKS.indexOf(normalized);
  if (index === -1) return 0;
  return index + 1;
}

function getBookName(id: number): string {
  return BOOKS[id - 1] || "";
}

function parseVerseId(id: number) {
  const b = Math.floor(id / 1000000);
  const c = Math.floor((id % 1000000) / 1000);
  const v = id % 1000;
  return { bookId: b, chapter: c, verse: v };
}

function openRefDb() {
  const dbPath = path.join(process.cwd(), 'bible', 'cross-references', 'cross_references.sqlite');
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath, { readonly: true });
}

function openBibleDb() {
  // Defaults to NWT-PT for now
  const dbPath = path.join(process.cwd(), 'bible', 'db', 'nwt-pt.sqlite');
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath, { readonly: true });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const book = url.searchParams.get("book");
    const chapter = url.searchParams.get("chapter");

    if (!book || !chapter) {
      return NextResponse.json({ error: "Book and Chapter are required" }, { status: 400 });
    }

    const bookId = getBookId(book);
    if (!bookId) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const chapterNum = Number(chapter);
    const startVid = bookId * 1000000 + chapterNum * 1000;
    const endVid = startVid + 999; // All verses in chapter

    const refDb = openRefDb();
    if (!refDb) {
      return NextResponse.json({ error: "Reference DB not found" }, { status: 500 });
    }

    let refs: any[] = [];
    try {
      refs = refDb.prepare(`
        SELECT vid, sv, ev 
        FROM cross_reference 
        WHERE vid >= ? AND vid <= ? 
        ORDER BY vid, r
      `).all(startVid, endVid);
    } finally {
      refDb.close();
    }

    // Group by source verse
    const grouped: Record<number, any[]> = {};

    refs.forEach((r: any) => {
      const src = parseVerseId(r.vid);
      if (!grouped[src.verse]) {
        grouped[src.verse] = [];
      }
      const target = parseVerseId(r.sv);
      
      grouped[src.verse].push({
        book: getBookName(target.bookId),
        chapter: target.chapter,
        verse: target.verse,
        vid: r.sv // keep full id
      });
    });

    return NextResponse.json({ references: grouped });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import path from "path";
import fs, { readdirSync } from "fs";
import Database from "better-sqlite3";
import type { Bible } from "@/types/bible";

export const runtime = "nodejs";

function loadBible(): Bible {
  const filePath = path.join(process.cwd(), "bible", "pt", "nwt-pt.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Bible;
}

import { BIBLE_NAMES, VULGATE_TO_PT, PT_TO_VULGATE, PT_TO_NWT, NWT_TO_PT } from "@/lib/bible-constants";
import { BIBLE_BOOKS_PT } from "@/lib/bible-books-pt";

function getVersions() {
  const dbDir = path.join(process.cwd(), "bible", "db");
  if (!fs.existsSync(dbDir)) return [];
  const files = readdirSync(dbDir).filter((file) => file.endsWith(".sqlite"));
  return files
    .map((file) => {
      const id = file.replace(".sqlite", "");
      return {
        id,
        name: BIBLE_NAMES[id] || id.toUpperCase(), // Use mapping or fallback to uppercase ID
        filename: file,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function openDb(version?: string) {
  const dbDir = path.join(process.cwd(), "bible", "db");
  // Decode the version in case it has URI encoded characters
  const cleanVersion = version ? decodeURIComponent(version).trim() : null;
  const filename = cleanVersion ? `${cleanVersion}.sqlite` : "nwt-pt.sqlite";
  const sqlitePath = path.join(dbDir, filename);
  
  if (!fs.existsSync(sqlitePath)) {
    return null;
  }
  return new Database(sqlitePath, { readonly: true });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const book = url.searchParams.get("book");
    const chapter = url.searchParams.get("chapter");
    const verse = url.searchParams.get("verse");
    const version = url.searchParams.get("version");
    const getAction = url.searchParams.get("get");

    if (getAction === "versions") {
      return NextResponse.json({ versions: getVersions() });
    }

    const db = openDb(version || undefined);

    if (version && !db) {
       return NextResponse.json(
        { error: `Versão da Bíblia não encontrada: ${version}` },
        { status: 404 }
      );
    }

    try {
      if (db) {
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

        // No params: return list of books
        if (!book) {
          let books: string[] = [];

          if (isLegacy) {
            const rows = db.prepare(`SELECT DISTINCT book FROM verses`).all() as { book: string }[];
            const rawBooks = rows.map((r) => r.book);
            
            // Mapear nomes se for NWT (ex: Salmo -> Salmos)
            // Isso é crucial pois o frontend filtra baseado em OT_BOOKS/NT_BOOKS que usam "Salmos"
            const mappedBooks = rawBooks.map(b => NWT_TO_PT[b] || b);

            // Use canonical order from constant to sort server-side
            const canonical = [...BIBLE_BOOKS_PT];
            
            // Ordenar usando os nomes mapeados ou originais se não houver mapeamento
            books = Array.from(new Set(mappedBooks)).sort((a, b) => {
              // Reverte o mapeamento para encontrar a ordem canônica original se necessário
              // Mas como canonical keys geralmente são padrão (Gênesis, Êxodo...), o mapped deve bater
              // Caso a chave canônica seja "Salmos" e o banco tenha "Salmo", o mapped já virou "Salmos"
              
              const ia = canonical.indexOf(a as any);
              const ib = canonical.indexOf(b as any);
              if (ia === -1 && ib === -1) return a.localeCompare(b);
              if (ia === -1) return 1;
              if (ib === -1) return -1;
              return ia - ib;
            });
          } else {
            // New Schema: book table with id, name
            const rows = db.prepare(`SELECT name FROM ${bookTable} ORDER BY id`).all() as { name: string }[];
            // If this is VULG (English names), map to Portuguese
            // Also normalize NWT names (Salmo -> Salmos)
            if (version === 'VULG') {
               books = rows.map(r => VULGATE_TO_PT[r.name] || r.name);
            } else {
               books = rows.map(r => NWT_TO_PT[r.name] || r.name);
               // Log para debug (remover depois)
               if (version?.includes('nwt')) {
                  console.log('NWT Books Debug:', books.filter(b => b.includes('Salm')));
               }
            }
          }
          
          return NextResponse.json({ books });
        }

        // Map Input Book Name for VULG (PT -> English)
        let queryBook = book;
        if (version === 'VULG' && PT_TO_VULGATE[book]) {
          queryBook = PT_TO_VULGATE[book];
        } else if (PT_TO_NWT[book]) {
          // Check for NWT/Global remapping (Salmos -> Salmo)
          // We do this check broadly or specifically for NWT if we want
          // Since "Salmos" -> "Salmo" is safe if the DB has "Salmo"
          // We can check if the mapped book exists or just try it?
          // For now, let's map if present in PT_TO_NWT
           queryBook = PT_TO_NWT[book];
        }

        // Only book provided: return chapters
        if (book && !chapter) {
          let chapters: number[] = [];
          if (isLegacy) {
            const rows = db
              .prepare(`SELECT DISTINCT chapter FROM verses WHERE book = ? ORDER BY chapter`)
              .all(queryBook) as { chapter: number }[];
            chapters = rows.map((r) => r.chapter);
          } else {
            const rows = db
              .prepare(`SELECT DISTINCT v.chapter FROM ${verseTable} v JOIN ${bookTable} b ON v.book_id = b.id WHERE b.name = ? ORDER BY v.chapter`)
              .all(queryBook) as { chapter: number }[];
            chapters = rows.map((r) => r.chapter);
          }
          return NextResponse.json({ book, chapters });
        }

        // Book + chapter, no verse: return verses for chapter
        if (book && chapter && !verse) {
          const chapNum = Number(chapter);
          let verses: number[] = [];
          let content: { verse: number; text: string }[] = [];
          let notes: string | null = null;

          if (isLegacy) {
            const versesRows = db
              .prepare(`SELECT verse, text FROM verses WHERE book = ? AND chapter = ? ORDER BY verse`)
              .all(queryBook, chapNum) as { verse: number; text: string }[];
            const notesRow = db
              .prepare(`SELECT notes FROM notes WHERE book = ? AND chapter = ? LIMIT 1`)
              .get(queryBook, chapNum) as { notes: string } | undefined;
            
            verses = versesRows.map((r) => r.verse);
            content = versesRows.map((r) => ({ verse: r.verse, text: r.text }));
            notes = notesRow?.notes ?? null;
          } else {
            const versesRows = db
              .prepare(`
                SELECT v.verse, v.text 
                FROM ${verseTable} v 
                JOIN ${bookTable} b ON v.book_id = b.id 
                WHERE b.name = ? AND v.chapter = ? 
                ORDER BY v.verse
              `)
              .all(queryBook, chapNum) as { verse: number; text: string }[];
            
            verses = versesRows.map((r) => r.verse);
            content = versesRows.map((r) => ({ verse: r.verse, text: r.text }));
            // New schema might not have notes table or it's different. Ignoring notes for now.
          }

          return NextResponse.json({ book, chapter: chapNum, verses, content, notes });
        }

        // Book + chapter + verse: return the specific verse
        if (book && chapter && verse) {
          const vNum = Number(verse);
          let one: { text?: string } | undefined;

          if (isLegacy) {
            one = db
              .prepare(`SELECT text FROM verses WHERE book = ? AND chapter = ? AND verse = ? LIMIT 1`)
              .get(queryBook, Number(chapter), vNum) as { text?: string } | undefined;
          } else {
            one = db
              .prepare(`
                SELECT v.text 
                FROM ${verseTable} v 
                JOIN ${bookTable} b ON v.book_id = b.id 
                WHERE b.name = ? AND v.chapter = ? AND v.verse = ? 
                LIMIT 1
              `)
              .get(queryBook, Number(chapter), vNum) as { text?: string } | undefined;
          }

          if (!one?.text) {
            return NextResponse.json(
              { error: `Versículo não encontrado: ${verse}` },
              { status: 404 }
            );
          }
          return NextResponse.json({ book, chapter: Number(chapter), verse: vNum, text: one.text });
        }
      }
    } finally {
      if (db) db.close();
    }

    // Fallback to JSON
    const bible = loadBible();

    // No params: return list of books
    if (!book) {
      const books = Object.keys(bible);
      return NextResponse.json({ books });
    }

    const bookData = bible[book];
    if (!bookData) {
      return NextResponse.json(
        { error: `Livro não encontrado: ${book}` },
        { status: 404 }
      );
    }

    // Only book provided: return chapters
    if (book && !chapter) {
      const chapters = Object.keys(bookData)
        .map((n) => Number(n))
        .sort((a, b) => a - b);
      return NextResponse.json({ book, chapters });
    }

    const chapterData = bookData[chapter!];
    if (!chapterData) {
      return NextResponse.json(
        { error: `Capítulo não encontrado: ${chapter}` },
        { status: 404 }
      );
    }

    // Book + chapter, no verse: return verses for chapter
    if (book && chapter && !verse) {
      const verses = Object.keys(chapterData.versos || {})
        .map((n) => Number(n))
        .sort((a, b) => a - b);
      const content = verses.map((v) => ({ verse: v, text: chapterData.versos[String(v)] }));
      const notes = chapterData.notas ?? null;
      return NextResponse.json({ book, chapter: Number(chapter), verses, content, notes });
    }

    // Book + chapter + verse: return the specific verse
    const text = chapterData.versos?.[verse!];
    if (!text) {
      return NextResponse.json(
        { error: `Versículo não encontrado: ${verse}` },
        { status: 404 }
      );
    }
    return NextResponse.json({ book, chapter: Number(chapter), verse: Number(verse), text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao carregar a Bíblia" }, { status: 500 });
  }
}

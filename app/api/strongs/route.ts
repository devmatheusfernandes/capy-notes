import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

export const runtime = "nodejs";

function openDb() {
  const dbPath = path.join(process.cwd(), "bible", "strongs", "strongs.db");
  
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath, { readonly: true });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "Parâmetro 'q' é obrigatório" }, { status: 400 });
    }

    const db = openDb();
    if (!db) {
      return NextResponse.json({ error: "Banco de dados Strongs não encontrado" }, { status: 500 });
    }

    const query = q.trim();
    const results: any[] = [];
    
    // Check if it's a specific Strong ID (e.g., G1234, H1234)
    const strongMatch = query.match(/^([GH])(\d+)$/i);
    
    if (strongMatch) {
      const type = strongMatch[1].toUpperCase(); // G or H
      const num = parseInt(strongMatch[2], 10);
      
      if (type === 'G') {
        // Greek IDs are padded to 5 digits in this DB? Let's check.
        // Sample: 00001. So likely yes.
        const idStr = num.toString().padStart(5, '0');
        const row = db.prepare("SELECT * FROM greek WHERE id = ?").get(idStr) as any;
        if (row) {
          results.push({
            id: `G${parseInt(row.id, 10)}`, // Return normalized G1
            originalId: row.id,
            lemma: row.lemma,
            transliteration: row.transliteration,
            pronunciation: row.pronunciation,
            definition: row.definition,
            usage: row.kjv_def,
            derivation: row.derivation,
            type: 'greek'
          });
        }
      } else {
        // Hebrew IDs seem to be just numbers in text
        const idStr = num.toString();
        const row = db.prepare("SELECT * FROM hebrew WHERE id = ?").get(idStr) as any;
        if (row) {
          results.push({
            id: `H${row.id}`,
            originalId: row.id,
            lemma: row.lemma,
            transliteration: row.transliteration,
            pronunciation: row.pronunciation,
            definition: row.exegesis,
            usage: row.translation,
            type: 'hebrew'
          });
        }
      }
    } else {
      // General text search
      // Search Greek
      const greekRows = db.prepare(`
        SELECT * FROM greek 
        WHERE lemma LIKE ? OR transliteration LIKE ? OR definition LIKE ? 
        LIMIT 20
      `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
      
      greekRows.forEach(row => {
        results.push({
          id: `G${parseInt(row.id, 10)}`,
          originalId: row.id,
          lemma: row.lemma,
          transliteration: row.transliteration,
          pronunciation: row.pronunciation,
          definition: row.definition,
          usage: row.kjv_def,
          derivation: row.derivation,
          type: 'greek'
        });
      });

      // Search Hebrew
      const hebrewRows = db.prepare(`
        SELECT * FROM hebrew 
        WHERE lemma LIKE ? OR transliteration LIKE ? OR exegesis LIKE ? 
        LIMIT 20
      `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];

      hebrewRows.forEach(row => {
        results.push({
          id: `H${row.id}`,
          originalId: row.id,
          lemma: row.lemma,
          transliteration: row.transliteration,
          pronunciation: row.pronunciation,
          definition: row.exegesis,
          usage: row.translation,
          type: 'hebrew'
        });
      });
    }

    return NextResponse.json({ results });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao buscar no dicionário Strongs" }, { status: 500 });
  }
}

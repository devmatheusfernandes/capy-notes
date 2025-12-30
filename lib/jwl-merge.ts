
import JSZip from "jszip";
import type { NoteData, TagData } from "@/types";

// Helper para converter Tiptap JSON para Texto Simples
function tiptapToPlainText(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  let text = "";
  if (content.type === "text") {
    text += content.text;
  } else if (content.content) {
    content.content.forEach((child: any) => {
      text += tiptapToPlainText(child);
    });
    // Adiciona quebra de linha para parágrafos
    if (content.type === "paragraph") {
      text += "\n";
    }
  }
  return text.trim();
}

// Helper para gerar UUID estilo JW Library
const generateUUID = () => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> (+c / 4)).toString(16)
  );
};

export async function mergeNotesToBackup(
  backupBlob: Blob,
  notesToExport: NoteData[],
  allSystemTags: TagData[]
): Promise<Blob> {
  // 1. Inicializar Dependências
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
  
  // 2. Carregar Backup Existente
  const zip = await JSZip.loadAsync(backupBlob);
  const manifestStr = await zip.file("manifest.json")?.async("string");
  if (!manifestStr) throw new Error("Manifesto inválido no backup selecionado");
  
  const manifest = JSON.parse(manifestStr);
  const dbName = manifest.userDataBackup?.databaseName || "userData.db";
  const dbData = await zip.file(dbName)?.async("uint8array");
  
  if (!dbData) throw new Error("Banco de dados não encontrado no backup");
  
  const db = new SQL.Database(dbData);

  try {
    db.run("BEGIN TRANSACTION");

    // 3. Inserir Notas
    for (const note of notesToExport) {
      const now = new Date().toISOString().replace("Z", "");
      const noteGuid = generateUUID();
      const contentText = tiptapToPlainText(note.content);
      const title = note.title || "Sem título";

      // A. Insere a Nota
      db.run(
        `INSERT INTO Note (Guid, UserMarkId, LocationId, Title, Content, LastModified, Created, BlockType) 
         VALUES (?, NULL, NULL, ?, ?, ?, ?, 0)`,
        [noteGuid, title, contentText, now, now]
      );
      
      const noteIdRes = db.exec("SELECT last_insert_rowid()");
      const newNoteId = noteIdRes[0].values[0][0] as number;

      // B. Processar Tags
      if (note.tagIds && note.tagIds.length > 0) {
        for (const tagId of note.tagIds) {
          // Encontra o nome da tag no sistema
          const tagData = allSystemTags.find(t => t.id === tagId);
          if (!tagData) continue;

          const tagName = tagData.name.trim();
          if (!tagName) continue;

          let dbTagId: number;

          // Verifica se a tag já existe no banco do JWL (pelo nome)
          const tagRes = db.exec("SELECT TagId FROM Tag WHERE Name = ?", [tagName]);
          
          if (tagRes.length > 0 && tagRes[0].values.length > 0) {
            dbTagId = tagRes[0].values[0][0] as number;
          } else {
            // Cria nova tag
            db.run("INSERT INTO Tag (Type, Name) VALUES (1, ?)", [tagName]);
            dbTagId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
          }

          // Calcula posição para TagMap
          const posRes = db.exec("SELECT MAX(Position) FROM TagMap WHERE TagId = ?", [dbTagId]);
          let nextPosition = 0;
          if (posRes.length > 0 && posRes[0].values[0][0] !== null) {
            nextPosition = (posRes[0].values[0][0] as number) + 1;
          }

          // Vincula Nota <-> Tag
          db.run("INSERT INTO TagMap (TagId, NoteId, Position) VALUES (?, ?, ?)", [dbTagId, newNoteId, nextPosition]);
        }
      }
    }

    db.run("COMMIT");

    // 4. Exportar Banco Atualizado
    const data = db.export();
    
    // 5. Atualizar Zip
    zip.file(dbName, data);
    
    // Atualiza data no manifesto (opcional, mas bom)
    manifest.creationDate = new Date().toISOString().slice(0, 10);
    zip.file("manifest.json", JSON.stringify(manifest));

    const newBlob = await zip.generateAsync({ type: "blob" });
    return newBlob;

  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

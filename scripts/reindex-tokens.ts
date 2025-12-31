import 'dotenv/config';
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore"
import { tokenize } from "@/lib/tokenize" // Certifique-se que essa é a versão corrigida (>= 2)

export async function reindexExistingVideos() {
  console.log("🔄 Iniciando re-indexação dos tokens...")
  
  const videosRef = collection(db, "videos")
  const snapshot = await getDocs(videosRef)
  
  if (snapshot.empty) {
    console.log("Nenhum vídeo encontrado para re-indexar.")
    return
  }

  console.log(`Encontrados ${snapshot.size} vídeos. Processando...`)

  let batch = writeBatch(db)
  let count = 0
  let totalUpdated = 0

  for (const document of snapshot.docs) {
    const data = document.data()
    
    // Se não tiver texto salvo, não dá pra gerar token (pula ou avisa)
    if (!data.contentText) {
      console.warn(`⚠ Vídeo ${document.id} sem contentText. Pulando.`)
      continue
    }

    // Gera os novos tokens com a regra de 2 letras
    const newTokens = tokenize(data.contentText)

    const docRef = doc(db, "videos", document.id)
    
    // Adiciona ao batch de escrita
    batch.update(docRef, { 
      tokens: newTokens,
      tokenVersion: 2, // Útil para saber quais já foram atualizados no futuro
      updatedAt: new Date().toISOString()
    })

    count++

    // Firebase permite max 500 operações por batch
    if (count >= 400) {
      await batch.commit()
      totalUpdated += count
      console.log(`💾 Salvos ${totalUpdated} vídeos...`)
      batch = writeBatch(db) // Novo batch
      count = 0
    }
  }

  // Commita o restante
  if (count > 0) {
    await batch.commit()
    totalUpdated += count
  }

  console.log(`✅ Re-indexação completa! ${totalUpdated} vídeos atualizados.`)
}

// Executar
import { fileURLToPath } from "url"
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  reindexExistingVideos().catch(console.error);
}
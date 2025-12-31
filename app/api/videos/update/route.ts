import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { getAllVideos, formatVttToText } from "@/lib/jwCrawler"
import { tokenize } from "@/lib/tokenize"
import crypto from "crypto"

export const dynamic = 'force-dynamic'

function hash(text: string) {
  return crypto.createHash("sha1").update(text).digest("hex")
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
      }

      try {
        sendUpdate({ type: 'start', message: 'Buscando lista de vídeos...' })
        
        // 1. Obter todos os vídeos do crawler
        const videos = await getAllVideos()
        sendUpdate({ type: 'videos_fetched', count: videos.length })

        let verifiedCount = 0
        let newCount = 0
        let errorCount = 0

        // 2. Iterar sobre os vídeos
        for (const video of videos) {
          try {
             verifiedCount++
             const ref = doc(db, "videos", video.id)
             const snap = await getDoc(ref)
             
             let action = 'skipped'

             // Só salva se NÃO existir
             if (!snap.exists()) {
                 if (!video.subtitlesUrl) {
                     // Sem legenda não dá pra indexar texto, mas talvez queira salvar o video mesmo assim?
                     // Por enquanto, vamos salvar apenas se tiver legenda para manter consistência com a busca
                     console.warn(`Vídeo ${video.title} sem URL de legenda.`)
                 } else {
                     sendUpdate({ 
                        type: 'processing_new', 
                        current: video.title 
                     })

                     const res = await fetch(video.subtitlesUrl)
                     if (!res.ok) {
                         console.error(`Falha ao baixar legenda para ${video.title}`)
                     } else {
                         const vtt = await res.text()
                         const text = formatVttToText(vtt)
                         const newHash = hash(text)

                         await setDoc(ref, {
                            ...video, // Salva metadados do vídeo (titulo, imagem, etc)
                            contentText: text,
                            tokens: tokenize(text),
                            subtitlesHash: newHash,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                         })
                         
                         newCount++
                         action = 'saved'
                     }
                 }
             }

             // Envia progresso a cada X vídeos ou sempre
             // Para feedback em tempo real, enviar sempre é bom, mas pode ser muito tráfego se forem milhares.
             // O user pediu contagem.
             sendUpdate({ 
                type: 'progress', 
                verified: verifiedCount, 
                new: newCount, 
                current: video.title,
                action
             })

          } catch (err) {
            console.error(`Erro ao processar ${video.title}:`, err)
            errorCount++
          }
        }
        
        sendUpdate({ type: 'done', verified: verifiedCount, new: newCount, errors: errorCount })
        controller.close()

      } catch (err) {
        console.error("Stream error:", err)
        sendUpdate({ type: 'error', message: String(err) })
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}

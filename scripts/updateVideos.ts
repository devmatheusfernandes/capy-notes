import 'dotenv/config';
import { db } from "@/lib/firebase"
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore"

import { getAllVideos, formatVttToText } from "@/lib/jwCrawler"
import { tokenize } from "@/lib/tokenize"
import crypto from "crypto"
import { fileURLToPath } from "url"

function hash(text: string) {
  return crypto.createHash("sha1").update(text).digest("hex")
}

export async function updateVideos() {
  const videos = await getAllVideos()

  for (const video of videos) {
    const ref = doc(db, "videos", video.id)
    const snap = await getDoc(ref)
    // Só atualiza se o vídeo já existir
    if (!snap.exists()) continue

    const res = await fetch(video.subtitlesUrl!)
    const vtt = await res.text()
    const text = formatVttToText(vtt)
    const newHash = hash(text)

    // Se o hash for igual, não precisa atualizar
    if (snap.data().subtitlesHash === newHash) continue

    await setDoc(
      ref,
      {
        contentText: text,
        tokens: tokenize(text),
        subtitlesHash: newHash,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )

    console.log("🔄 atualizado:", video.title)
  }

  console.log("✅ atualização concluída")
}

// Executar se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateVideos().catch(console.error);
}

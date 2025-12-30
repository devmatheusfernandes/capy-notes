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

function hash(text: string) {
  return crypto.createHash("sha1").update(text).digest("hex")
}

export async function importAllVideos() {
  const videos = await getAllVideos()

  for (const video of videos) {
    const ref = doc(db, "videos", video.id)
    const snap = await getDoc(ref)
    if (snap.exists()) continue

    const res = await fetch(video.subtitlesUrl!)
    const vtt = await res.text()
    const contentText = formatVttToText(vtt)

    // Remove campos undefined do objeto video para o Firestore aceitar
    const cleanVideo = Object.fromEntries(
      Object.entries(video).filter(([_, v]) => v !== undefined)
    );

    await setDoc(ref, {
      ...cleanVideo,
      contentText,
      tokens: tokenize(contentText),
      subtitlesHash: hash(contentText),
      tokenVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    console.log("✔ importado:", video.title)
  }

  console.log("✅ importação finalizada")
}

import { fileURLToPath } from "url"

// Executar se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  importAllVideos().catch(console.error);
}

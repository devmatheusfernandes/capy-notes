import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, deleteField } from "firebase/firestore"

const API_URL = "https://b.jw-cdn.org/apis/mediator/v1/categories/T/VODPgmEvtMorningWorship?detailed=1&clientType=www"

export type MorningWorshipData = {
  id: string
  title: string
  contentText: string
  coverImage?: string
  book?: string
  subtitlesUrl?: string
  importedAsNote?: boolean
  noteId?: string
  createdAt: string
  updatedAt: string
}

export function formatVttToText(vtt: string): string {
  const lines = vtt.split("\n")
  const paragraphs: string[] = []
  let buffer = ""
  for (let raw of lines) {
    let line = raw.trim()
    if (!line) continue
    if (line.startsWith("WEBVTT")) continue
    if (line.includes("-->")) continue
    if (/^[0-9]+$/.test(line)) continue
    line = line.replace(/<[^>]+>/g, "").trim()
    if (buffer.length > 0) {
      buffer += " " + line
    } else {
      buffer = line
    }
    if (/[.!?…]$/.test(line)) {
      paragraphs.push(buffer.trim())
      buffer = ""
    }
  }
  if (buffer) paragraphs.push(buffer.trim())
  return paragraphs.join("\n\n")
}

const BOOKS = [
  "Gênesis","Êxodo","Levítico","Números","Deuteronômio",
  "Josué","Juízes","Rute","1 Samuel","2 Samuel",
  "1 Reis","2 Reis","Salmos","Provérbios","Eclesiastes",
  "Isaías","Jeremias","Ezequiel","Daniel","Mateus",
  "Marcos","Lucas","João","Atos","Romanos",
  "1 Coríntios","2 Coríntios","Gálatas","Efésios",
  "Filipenses","Colossenses","Hebreus","Tiago",
  "1 Pedro","2 Pedro","1 João","2 João","3 João",
  "Judas","Apocalipse"
]

function extractBook(title: string): string | undefined {
  const lower = title.toLowerCase()
  for (const b of BOOKS) {
    if (lower.includes(b.toLowerCase())) return b
  }
  return undefined
}

async function fetchCategory(): Promise<any[]> {
  const res = await fetch(API_URL)
  const data = await res.json()
  return Array.isArray(data?.category?.media) ? data.category.media : []
}

function selectBestVideoUrl(files: any[] = []): string | undefined {
  const mp4s = files.filter((f) => String(f?.mimetype || "").includes("mp4"))
  if (mp4s.length === 0) return undefined
  mp4s.sort((a, b) => {
    const ah = Number(a?.frameHeight || 0)
    const bh = Number(b?.frameHeight || 0)
    const ar = Number(a?.bitRate || 0)
    const br = Number(b?.bitRate || 0)
    if (bh !== ah) return bh - ah
    return br - ar
  })
  return mp4s[mp4s.length - 1]?.progressiveDownloadURL
}

export async function listMorningWorshipMedia(): Promise<Array<{ id: string; title: string; coverImage?: string; subtitlesUrl?: string; videoUrl?: string }>> {
  const media = await fetchCategory()
  return media.map((video) => {
    const id: string = video.naturalKey
    const title: string = video.title || ""
    const coverImage: string | undefined = video.images?.wss?.lg || video.images?.pnr?.lg || undefined
    let subtitlesUrl: string | undefined
    for (const f of video.files || []) {
      if (f?.subtitles?.url) {
        subtitlesUrl = f.subtitles.url
        break
      }
    }
    const videoUrl = selectBestVideoUrl(video.files || [])
    return { id, title, coverImage, subtitlesUrl, videoUrl }
  })
}

export async function importMorningWorships(userId: string): Promise<{ downloaded: number; total: number }> {
  const col = collection(db, "users", userId, "morningworships")
  const existingSnap = await getDocs(col)
  const existing = new Set(existingSnap.docs.map((d) => d.id))
  const media = await fetchCategory()
  let downloaded = 0
  for (const video of media) {
    const mediaId: string = video.naturalKey
    if (!mediaId || existing.has(mediaId)) continue
    let vttUrl: string | undefined
    for (const f of video.files || []) {
      if (f?.subtitles?.url) {
        vttUrl = f.subtitles.url
        break
      }
    }
    if (!vttUrl) continue
    const vttRes = await fetch(vttUrl)
    const raw = await vttRes.text()
    const formatted = formatVttToText(raw)
    const title: string = video.title || ""
    const coverImage: string | undefined = video.images?.wss?.lg || video.images?.pnr?.lg || undefined
    const now = new Date().toISOString()
    const payload: MorningWorshipData = {
      id: mediaId,
      title,
      contentText: formatted,
      coverImage,
      book: extractBook(title),
      subtitlesUrl: vttUrl,
      createdAt: now,
      updatedAt: now,
    }
    const ref = doc(col, mediaId)
    await setDoc(ref, payload)
    downloaded++
  }
  return { downloaded, total: media.length }
}

export function subscribeMorningWorships(userId: string, onData: (items: MorningWorshipData[]) => void) {
  const ref = collection(db, "users", userId, "morningworships")
  return onSnapshot(ref, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MorningWorshipData, "id">) })) as MorningWorshipData[]
    onData(items)
  })
}

export async function getMorningWorship(userId: string, id: string): Promise<MorningWorshipData | null> {
  const ref = doc(db, "users", userId, "morningworships", id)
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MorningWorshipData, "id">) } as MorningWorshipData) : null
}

export async function setMorningWorshipNoteLink(userId: string, id: string, noteId: string) {
  const ref = doc(db, "users", userId, "morningworships", id)
  const now = new Date().toISOString()
  await setDoc(ref, { importedAsNote: true, noteId, updatedAt: now }, { merge: true })
}

export async function clearMorningWorshipNoteLink(userId: string, id: string) {
  const ref = doc(db, "users", userId, "morningworships", id)
  const now = new Date().toISOString()
  await setDoc(ref, { importedAsNote: false, noteId: deleteField(), updatedAt: now }, { merge: true })
}


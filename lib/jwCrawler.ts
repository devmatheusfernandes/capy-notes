// src/lib/jwCrawler.ts

export type VideoData = {
  id: string
  title: string
  categoryKey: string
  primaryCategory: string
  durationFormatted: string
  coverImage?: string
  subtitlesUrl?: string
  videoUrl?: string
  book?: string
}

// ---------------- CONFIG ----------------

const ROOT_CATEGORY = "VideoOnDemand"

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
  return BOOKS.find(b => lower.includes(b.toLowerCase()))
}

// ---------------- SUBTITLE ----------------

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

    buffer = buffer ? buffer + " " + line : line

    if (/[.!?…]$/.test(line)) {
      paragraphs.push(buffer)
      buffer = ""
    }
  }

  if (buffer) paragraphs.push(buffer)

  return paragraphs.join("\n\n")
}

// ---------------- VIDEO URL ----------------

function selectBestVideoUrl(files: any[] = []): string | undefined {
  const mp4s = files.filter(f => String(f?.mimetype).includes("mp4"))
  if (!mp4s.length) return undefined

  mp4s.sort((a, b) =>
    (b.frameHeight ?? 0) - (a.frameHeight ?? 0) ||
    (b.bitRate ?? 0) - (a.bitRate ?? 0)
  )

  return mp4s.at(-1)?.progressiveDownloadURL
}

// ---------------- FETCH ----------------

async function fetchCategory(key: string): Promise<any> {
  const url = `https://b.jw-cdn.org/apis/mediator/v1/categories/T/${key}?detailed=1&mediaLimit=0&clientType=www`
  const res = await fetch(url)
  return res.json()
}

// ---------------- CRAWLER ----------------

export async function getAllVideos(): Promise<VideoData[]> {
  const visited = new Set<string>()
  const results: VideoData[] = []

  async function crawl(key: string) {
    if (visited.has(key)) return
    visited.add(key)

    const data = await fetchCategory(key)
    const cat = data?.category
    if (!cat) return

    for (const video of cat.media || []) {
      let subtitlesUrl: string | undefined

      for (const f of video.files || []) {
        if (f?.subtitles?.url) {
          subtitlesUrl = f.subtitles.url
          break
        }
      }

      if (!subtitlesUrl) continue

      results.push({
        id: video.naturalKey,
        title: video.title,
        categoryKey: key,
        primaryCategory: video.primaryCategory ?? key,
        durationFormatted: video.durationFormattedMinSec,
        coverImage:
          video.images?.wss?.lg ||
          video.images?.pnr?.lg ||
          video.images?.sqr?.lg,
        subtitlesUrl,
        videoUrl: selectBestVideoUrl(video.files),
        book: extractBook(video.title)
      })
    }

    for (const sub of cat.subcategories || []) {
      await crawl(sub.key)
    }
  }

  await crawl(ROOT_CATEGORY)
  return results
}

import { db } from "@/lib/firebase"
import { collection, doc, getDoc, onSnapshot, setDoc, deleteField, query, where, getDocs, limit } from "firebase/firestore"
import { normalizeTerm, tokenize } from "@/lib/tokenize"
import { CATEGORY_NAMES } from "@/lib/constants"

const ROOT_CATEGORY = "VideoOnDemand"

export type VideoData = {
  id: string
  title: string
  categoryKey: string
  primaryCategory: string
  durationFormatted: string
  coverImage?: string
  subtitlesUrl?: string
  videoUrl?: string
  book?: string // Bible book if detected in title
  // Fields for local state
  importedAsNote?: boolean
  noteId?: string
  contentText?: string
  createdAt?: string
  updatedAt?: string
  tokens?: string[]
}

export type CategoryGroup = {
  key: string
  title: string
  videos: VideoData[]
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

// Helper to extract subtitles (reused/adapted logic)
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

// Helper to fetch any category
async function fetchCategory(key: string): Promise<any> {
  const url = `https://b.jw-cdn.org/apis/mediator/v1/categories/T/${key}?detailed=1&mediaLimit=0&clientType=www`
  const res = await fetch(url)
  return res.json()
}

// Recursive crawler to find all videos
async function crawlCategory(key: string, visited = new Set<string>()): Promise<CategoryGroup[]> {
  if (visited.has(key)) return []
  visited.add(key)

  try {
    const data = await fetchCategory(key)
    const category = data?.category
    if (!category) return []

    // 1. If it has media, it's a content category (leaf or mixed)
    let myGroup: CategoryGroup | null = null
    const mediaList = Array.isArray(category.media) ? category.media : []
    
    // Filter for videos with subtitles
    const validVideos: VideoData[] = []
    
    for (const video of mediaList) {
       // Check for subtitles
       let subtitlesUrl: string | undefined
       for (const f of video.files || []) {
         if (f?.subtitles?.url) {
           subtitlesUrl = f.subtitles.url
           break
         }
       }
       
       // Only include if subtitles exist (per user request)
       if (!subtitlesUrl) continue

       const id: string = video.naturalKey
       const title: string = video.title || ""
       const primaryCategory = video.primaryCategory || key
       const durationFormatted = video.durationFormattedMinSec || ""
       const coverImage: string | undefined = video.images?.wss?.lg || video.images?.pnr?.lg || video.images?.sqr?.lg || undefined
       const videoUrl = selectBestVideoUrl(video.files || [])

       validVideos.push({
         id,
         title,
         categoryKey: key, // Use current category key as the grouping key
         primaryCategory,
         durationFormatted,
         coverImage,
         subtitlesUrl,
         videoUrl,
         book: extractBook(title)
       })
    }

    if (validVideos.length > 0) {
      myGroup = {
        key: category.key,
        title: category.name || CATEGORY_NAMES[category.key] || category.key,
        videos: validVideos
      }
    }

    // 2. Recursively fetch subcategories
    const subResults: CategoryGroup[] = []
    const subcategories = Array.isArray(category.subcategories) ? category.subcategories : []
    
    if (subcategories.length > 0) {
      // Fetch subcategories in parallel
      const results = await Promise.all(
        subcategories.map((sub: any) => crawlCategory(sub.key, visited))
      )
      for (const res of results) {
        subResults.push(...res)
      }
    }

    // Combine results
    const finalResults = []
    if (myGroup) finalResults.push(myGroup)
    finalResults.push(...subResults)
    
    return finalResults

  } catch (err) {
    console.error(`Error crawling category ${key}:`, err)
    return []
  }
}

export async function getAllVideosGrouped(): Promise<CategoryGroup[]> {
  // Start crawling from the root
  const groups = await crawlCategory(ROOT_CATEGORY)
  return groups
}

// --- Firebase Operations ---

// Subscribe to local state (imported notes, etc.)
export function subscribeAllVideos(userId: string, onData: (items: VideoData[]) => void) {
  const ref = collection(db, "users", userId, "all_videos")
  return onSnapshot(ref, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VideoData, "id">) })) as VideoData[]
    onData(items)
  })
}

// Set a video as imported (linked to a note)
export async function setVideoNoteLink(userId: string, id: string, noteId: string) {
  const ref = doc(db, "users", userId, "all_videos", id)
  const now = new Date().toISOString()
  await setDoc(ref, { importedAsNote: true, noteId, updatedAt: now }, { merge: true })
}

export async function clearVideoNoteLink(userId: string, id: string) {
  const ref = doc(db, "users", userId, "all_videos", id)
  const now = new Date().toISOString()
  await setDoc(ref, { importedAsNote: false, noteId: deleteField(), updatedAt: now }, { merge: true })
}

export async function saveVideoContent(userId: string, video: VideoData, contentText: string) {
    const ref = doc(db, "users", userId, "all_videos", video.id)
    const now = new Date().toISOString()
    const payload = {
        ...video,
        contentText,
        updatedAt: now
    }
    await setDoc(ref, payload, { merge: true })
}

export async function getVideoById(id: string): Promise<VideoData | null> {
  // 1. Try Firestore first
  const ref = doc(db, "videos", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as VideoData
  }

  // 2. Fallback to API
  try {
    const url = `https://b.jw-cdn.org/apis/mediator/v1/media-items/T/${id}?clientType=www`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const video = data.media[0]
    
    if (!video) return null

    // Extract same fields as crawlCategory
    let subtitlesUrl: string | undefined
    for (const f of video.files || []) {
      if (f?.subtitles?.url) {
        subtitlesUrl = f.subtitles.url
        break
      }
    }

    const title: string = video.title || ""
    const primaryCategory = video.primaryCategory || "VideoOnDemand"
    const durationFormatted = video.durationFormattedMinSec || ""
    const coverImage: string | undefined = video.images?.wss?.lg || video.images?.pnr?.lg || video.images?.sqr?.lg || undefined
    const videoUrl = selectBestVideoUrl(video.files || [])

    return {
      id: video.naturalKey,
      title,
      categoryKey: video.primaryCategory || "VideoOnDemand",
      primaryCategory,
      durationFormatted,
      coverImage,
      subtitlesUrl,
      videoUrl,
      book: extractBook(title),
      // Try to get content text if subtitles exist? 
      // We might not have it parsed yet, so contentText might be undefined.
      // But we can try to fetch subtitles on the fly in the page component if needed.
    }
  } catch (err) {
    console.error("Error fetching video from API:", err)
    return null
  }
}

export async function searchVideosByToken(term: string): Promise<VideoData[]> {
  const normalizedTerm = normalizeTerm(term).trim()
  if (!normalizedTerm) return []
  
  // Use tokenize to get the actual indexed tokens (ignores stopwords, handles punctuation)
  const searchTokens = tokenize(term)
  if (searchTokens.length === 0) return []

  // Limit to top 5 tokens to avoid excessive reads, but prioritize searching all if possible
  const tokensToQuery = searchTokens.slice(0, 5)
  
  const videosRef = collection(db, "videos")
  
  // Run parallel queries for each token
  // Each query gets up to 100 results. We combine them.
  const promises = tokensToQuery.map(token => {
      const q = query(
        videosRef, 
        where("tokens", "array-contains", token),
        limit(100)
      )
      return getDocs(q)
  })
  
  try {
      const snapshots = await Promise.all(promises)
      
      const videoMap = new Map<string, VideoData>()
      
      snapshots.forEach(snap => {
          snap.docs.forEach(doc => {
              if (!videoMap.has(doc.id)) {
                  videoMap.set(doc.id, { id: doc.id, ...doc.data() } as VideoData)
              }
          })
      })
      
      return Array.from(videoMap.values())
  } catch (err) {
      console.error("Error searching videos:", err)
      return []
  }
}

export { CATEGORY_NAMES }

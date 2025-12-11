import type { NoteData } from "@/types"

export function getPreviewText(note: NoteData, max = 300): string {
  try {
    const c: any = note.content as any
    const blocks = c?.content || []
    for (const b of blocks) {
      const texts: string[] = []
      const collect = (node: any) => {
        if (!node) return
        if (typeof node.text === "string") texts.push(node.text)
        if (Array.isArray(node.content)) node.content.forEach(collect)
      }
      collect(b)
      const t = texts.join(" ").trim()
      if (t) return t.length > max ? t.slice(0, max) + "…" : t
    }
    return ""
  } catch {
    return ""
  }
}


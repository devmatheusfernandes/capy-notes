"use client"

import * as React from "react"
import UniversalSidebar from "@/components/tiptap-templates/simple/universal-sidebar"
import { Editor } from "@tiptap/react"
import { parseAllReferences, formatReferenceTitle } from "@/components/utils/bible-parse"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

type BibleSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  title?: string
  desktopWidth?: number | string
  selectedText?: string
}

type Item = { key: string; title: string; content: string; info?: { book: string; chapter: number; verse?: number; verses?: number[] } }

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.9, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
}

export default function BibleSidebar({ open, onOpenChange, editor, title = "Bíblia", desktopWidth = "22%", selectedText }: BibleSidebarProps) {
  const [items, setItems] = React.useState<Item[]>([])
  const [selectedItems, setSelectedItems] = React.useState<Item[]>([])
  const [tab, setTab] = React.useState<string>("document")
  const cacheRef = React.useRef(new Map<string, string>())
  const router = useRouter()

  const fetchContentForInfo = React.useCallback(
    async (info: { book: string; chapter: number; verse?: number; verses?: number[] }): Promise<{ title: string; content: string }> => {
      const selected = info.verse && !info.verses ? [info.verse] : info.verses ?? []
      const cacheKey = `${info.book}|${info.chapter}|${selected.length ? selected.join(",") : "chapter"}`
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        return { title: formatReferenceTitle(info, selected.length ? selected : undefined), content: cached }
      }
      try {
        if (info.verse && !info.verses) {
          const params = new URLSearchParams({ book: info.book, chapter: String(info.chapter), verse: String(info.verse) })
          const res = await fetch(`/api/bible?${params.toString()}`)
          const data = await res.json()
          const title = formatReferenceTitle(info)
          const content = data.text ?? ""
          cacheRef.current.set(cacheKey, content)
          return { title, content }
        } else {
          const params = new URLSearchParams({ book: info.book, chapter: String(info.chapter) })
          const res = await fetch(`/api/bible?${params.toString()}`)
          const data = await res.json()
          const selectedVerses = selected.length > 0 ? selected : (data.verses as number[])
          const byNumber = new Map<number, string>()
          for (const item of data.content as { verse: number; text: string }[]) {
            byNumber.set(item.verse, item.text)
          }
          const lines: string[] = []
          for (const v of selectedVerses) {
            const t = byNumber.get(v)
            if (t) lines.push(`${v}. ${t}`)
          }
          const title = formatReferenceTitle(info, selectedVerses)
          const content = lines.join("\n\n")
          cacheRef.current.set(cacheKey, content)
          return { title, content }
        }
      } catch {
        return { title: formatReferenceTitle(info), content: "Erro ao carregar." }
      }
    },
    []
  )

  React.useEffect(() => {
    if (!editor) return

    const performCollection = async () => {
      const links: { key: string; text: string }[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const linkMark = node.marks.find((m) => m.type.name === "link")
          if (linkMark && String(linkMark.attrs.href || "").startsWith("#bible")) {
            links.push({ key: String(pos), text: node.text || "" })
          }
        }
      })
      const collected: Item[] = []
      for (const { key, text } of links) {
        const plain = text.replace(/\u00A0/g, " ")
        const infos = parseAllReferences(plain)
        for (const info of infos) {
          const { title, content } = await fetchContentForInfo(info)
          collected.push({ key, title, content, info })
        }
      }
      setItems(collected)
    }

    const handleUpdate = () => { void performCollection() }
    editor.on("update", handleUpdate)
    void performCollection()
    return () => { editor.off("update", handleUpdate) }
  }, [editor, fetchContentForInfo])

  React.useEffect(() => {
    const run = async () => {
      const txt = (selectedText || "").trim()
      if (!txt) {
        setSelectedItems([])
        return
      }
      const infos = parseAllReferences(txt.replace(/\u00A0/g, " "))
      const collected: Item[] = []
      for (const info of infos) {
        const { title, content } = await fetchContentForInfo(info)
        collected.push({ key: "selected", title, content, info })
      }
      setSelectedItems(collected)
    }
    void run()
  }, [selectedText, fetchContentForInfo])

  React.useEffect(() => {
    if ((selectedText || "").trim().length > 0) setTab("selected")
  }, [selectedText])

  return (
    <UniversalSidebar open={open} onOpenChange={onOpenChange} title={title} desktopWidth={desktopWidth}>
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-900/50">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <div className="p-3">
            <TabsList>
              <TabsTrigger value="document">Documento</TabsTrigger>
              <TabsTrigger value="selected">Selecionado</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="document">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground text-sm py-10">Nenhuma referência encontrada.</motion.div>
                ) : (
                  items.map((it, idx) => (
                    <motion.div
                      layoutId={`${it.key}-${idx}`}
                      key={`${it.key}-${idx}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="group relative rounded-xl border bg-card p-4 text-sm transition-all hover:shadow-md border-border shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800"
                      onClick={() => {
                        const pos = parseInt(it.key, 10)
                        if (!Number.isNaN(pos) && editor) {
                          editor.chain().focus().setTextSelection(pos).scrollIntoView().run()
                        }
                      }}
                    >
                      <div className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">{it.title}</div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{it.content || ""}</p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
          <TabsContent value="selected">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {selectedItems.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground text-sm py-10">Selecione uma referência para visualizar.</motion.div>
                ) : (
                  selectedItems.map((it, idx) => (
                    <motion.div
                      layoutId={`sel-${idx}`}
                      key={`sel-${idx}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="group relative rounded-xl border bg-card p-4 text-sm transition-all hover:shadow-md border-border shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer"
                      onClick={() => {
                        const info = it.info
                        if (!info) return
                        const q = new URLSearchParams()
                        q.set("book", info.book)
                        q.set("chapter", String(info.chapter))
                        const v = info.verse ?? (info.verses && info.verses.length > 0 ? info.verses[0] : undefined)
                        if (typeof v === "number") q.set("verse", String(v))
                        router.push(`/hub/spiritual/bible?${q.toString()}`)
                      }}
                    >
                      <div className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">{it.title}</div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{it.content || ""}</p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalSidebar>
  )
}


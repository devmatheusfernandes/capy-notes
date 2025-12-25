"use client"

import * as React from "react"
import UniversalSidebar from "@/components/tiptap-templates/simple/universal-sidebar"
import { Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

type BibleReferenceSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: string
  chapter: number
  selectedVerse?: number | null
}

type Reference = {
  book: string
  chapter: number
  verse: number
  text: string
  vid: number
}

export default function BibleReferenceSidebar({ open, onOpenChange, book, chapter, selectedVerse }: BibleReferenceSidebarProps) {
  const [references, setReferences] = React.useState<Record<string, Reference[]>>({})
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    if (!open || !book || !chapter) return

    setLoading(true)
    fetch(`/api/bible/references?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(res => res.json())
      .then(data => {
        setReferences(data.references || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, book, chapter])

  const filteredReferences = React.useMemo(() => {
    if (!selectedVerse) return references
    const filtered: Record<string, Reference[]> = {}
    if (references[String(selectedVerse)]) {
      filtered[String(selectedVerse)] = references[String(selectedVerse)]
    }
    return filtered
  }, [references, selectedVerse])

  const handleNavigate = (ref: Reference) => {
    const params = new URLSearchParams()
    params.set("book", ref.book)
    params.set("chapter", String(ref.chapter))
    params.set("verse", String(ref.verse))
    router.push(`/hub/spiritual/bible?${params.toString()}`)
  }


  return (
    <UniversalSidebar open={open} onOpenChange={onOpenChange} title="Referências Cruzadas" desktopWidth="25%">
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : Object.keys(filteredReferences).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center">Nenhuma referência encontrada{selectedVerse ? ` para o versículo ${selectedVerse}` : ""}.</p>
        ) : (
          Object.entries(filteredReferences).map(([verse, refs]) => (
            <div key={verse} className="space-y-2">
              <h3 className="font-semibold text-sm border-b pb-1 text-primary sticky top-0 bg-background z-10">
                Versículo {verse}
              </h3>
              <div className="space-y-3">
                {refs.map((ref, i) => (
                  <div 
                    key={i} 
                    className="group text-sm bg-muted/30 p-2 rounded-md border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors cursor-pointer relative"
                    onClick={() => handleNavigate(ref)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        {ref.book} {ref.chapter}:{ref.verse}
                      </p>
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-foreground/90 leading-relaxed text-xs">
                      {ref.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </UniversalSidebar>
  )
}

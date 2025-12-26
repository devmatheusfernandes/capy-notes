"use client"

import * as React from "react"
import UniversalSidebar from "@/components/tiptap-templates/simple/universal-sidebar"
import { Loader2, ArrowRight, ChevronRight, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useBibleReference } from "@/hooks/use-bible-reference"

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
  text?: string
  vid: number
}

function ReferenceItem({ refData }: { refData: Reference }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const router = useRouter()
  
  // Fetch text only when open and if text is missing
  const shouldFetch = isOpen && !refData.text
  
  const { data, loading } = useBibleReference({
    book: shouldFetch ? refData.book : undefined,
    chapter: shouldFetch ? refData.chapter : undefined,
    verse: shouldFetch ? refData.verse : undefined
  })

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const params = new URLSearchParams()
    params.set("book", refData.book)
    params.set("chapter", String(refData.chapter))
    params.set("verse", String(refData.verse))
    router.push(`/hub/spiritual/bible?${params.toString()}`)
  }

  const displayText = data?.text || refData.text

  return (
    <div className="group text-sm bg-muted/30 rounded-md border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all overflow-hidden">
      <div 
        className="flex justify-between items-center p-2 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
           {isOpen ? (
             <ChevronDown className="w-3 h-3 text-muted-foreground" />
           ) : (
             <ChevronRight className="w-3 h-3 text-muted-foreground" />
           )}
           <p className="font-medium text-xs text-muted-foreground group-hover:text-primary transition-colors">
             {refData.book} {refData.chapter}:{refData.verse}
           </p>
        </div>
        <button 
          onClick={handleNavigate}
          className="p-1 rounded-sm hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Ir para versículo"
        >
          <ArrowRight className="w-3 h-3 text-muted-foreground hover:text-primary" />
        </button>
      </div>
      
      {isOpen && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 fade-in duration-200">
           {loading ? (
             <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
               <Loader2 className="w-3 h-3 animate-spin" />
               <span>Carregando...</span>
             </div>
           ) : (
             <p className="text-foreground/90 leading-relaxed text-xs border-l-2 border-primary/20 pl-2">
               {displayText}
             </p>
           )}
        </div>
      )}
    </div>
  )
}

export default function BibleReferenceSidebar({ open, onOpenChange, book, chapter, selectedVerse }: BibleReferenceSidebarProps) {
  const [references, setReferences] = React.useState<Record<string, Reference[]>>({})
  const [loading, setLoading] = React.useState(false)

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
              <h3 className="font-semibold text-sm border-b pb-1 text-primary sticky top-0 bg-background z-10 flex items-center justify-between">
                <span>Versículo {verse}</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{refs.length}</span>
              </h3>
              <div className="space-y-2">
                {refs.map((ref, i) => (
                  <ReferenceItem key={i} refData={ref} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </UniversalSidebar>
  )
}

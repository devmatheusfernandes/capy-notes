"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Loader2, 
  LayoutGrid, 
  List as ListIcon, 
  Search, 
  Play, 
  FileText, 
  Check, 
  X, 
  ArrowLeft,
  RefreshCw,
  Clock
} from "lucide-react"
import { useCurrentUserId } from "@/hooks/notes"
import { 
  getAllVideosGrouped, 
  subscribeAllVideos, 
  formatVttToText, 
  setVideoNoteLink, 
  clearVideoNoteLink, 
  type VideoData 
} from "@/lib/all-videos"
import { createNote, getNote } from "@/lib/notes"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function CategoryVideosPage() {
  const router = useRouter()
  const params = useParams()
  const categoryKey = params?.category as string
  const userId = useCurrentUserId()
  
  const [categoryTitle, setCategoryTitle] = useState<string>("")
  const [apiItems, setApiItems] = useState<VideoData[]>([])
  const [savedItems, setSavedItems] = useState<VideoData[]>([])
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  
  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  
  // Video Player States
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [modalVideo, setModalVideo] = useState<VideoData | null>(null)

  useEffect(() => {
    if (!categoryKey) return
    ;(async () => {
      try {
        const groups = await getAllVideosGrouped()
        let group = groups.find(g => g.key === categoryKey)
        
        // Fallback decodificado
        if (!group) {
           const decoded = decodeURIComponent(categoryKey)
           group = groups.find(g => g.key === decoded)
        }

        if (group) {
          setCategoryTitle(group.title)
          setApiItems(group.videos)
        }
      } catch {
        toast.error("Erro ao carregar vídeos")
      } finally {
        setInitialLoading(false)
      }
    })()
  }, [categoryKey])

  useEffect(() => {
    if (!userId) return
    const unsub = subscribeAllVideos(userId, (items) => setSavedItems(items))
    return () => unsub()
  }, [userId])

  const savedMap = useMemo(() => new Map(savedItems.map((it) => [it.id, it])), [savedItems])

  const filteredItems = useMemo(() => {
    return apiItems.filter((item) => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [apiItems, searchQuery])

  const handleUpdate = async () => {
    setLoadingUpdate(true)
    try {
      const groups = await getAllVideosGrouped()
      const group = groups.find(g => g.key === categoryKey) || groups.find(g => g.key === decodeURIComponent(categoryKey))
      
      if (group) {
        const prevIds = new Set(apiItems.map((i) => i.id))
        const next = group.videos
        const newCount = next.filter((it) => !prevIds.has(it.id)).length
        setApiItems(next)
        if (newCount > 0) {
          toast.success(`${newCount} novos vídeos encontrados!`)
        } else {
          toast.info("Tudo atualizado.")
        }
      }
    } finally {
      setLoadingUpdate(false)
    }
  }

  const handleImportNote = async (item: VideoData) => {
    if (!userId) return
    let text = savedMap.get(item.id)?.contentText
    if (!text && item.subtitlesUrl) {
      try {
        const res = await fetch(item.subtitlesUrl)
        const raw = await res.text()
        text = formatVttToText(raw)
      } catch {
        toast.error("Erro ao baixar legendas")
        return
      }
    }
    
    // Create Note Content
    const paragraphs = (text || "").split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    const content = {
      type: "doc",
      content: paragraphs.length
        ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))
        : [{ type: "paragraph" }],
    }
    
    const created = await createNote(userId, { title: item.title, content })
    await setVideoNoteLink(userId, item.id, created.id)
    toast.success("Nota criada com sucesso")
  }

  const handleOpenNote = async (item: VideoData) => {
    if (!userId) return
    const saved = savedMap.get(item.id)
    const noteId = saved?.noteId
    if (noteId) {
      const existing = await getNote(userId, noteId)
      if (existing) {
        router.push(`/hub/notes/${noteId}`)
        return
      }
      await clearVideoNoteLink(userId, item.id)
      toast.info("Nota não encontrada. Importe novamente.")
      return
    }
  }

  const handlePlay = (item: VideoData) => {
    if (viewMode === "grid") {
      setPlayingId(item.id)
    } else {
      setModalVideo(item)
    }
  }

  // --- Components ---

  const VideoPlayer = ({ item, autoPlay = false, onClose }: { item: VideoData, autoPlay?: boolean, onClose?: () => void }) => (
    <div className="relative w-full h-full bg-black group animate-in fade-in duration-300">
      <video 
        src={item.videoUrl} 
        className="w-full h-full object-contain" 
        controls 
        autoPlay={autoPlay}
        playsInline
      >
        {item.subtitlesUrl && <track kind="subtitles" src={item.subtitlesUrl} label="Português" default />}
      </video>
      {onClose && (
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm z-10"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modal Video Player */}
      <AnimatePresence>
        {modalVideo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setModalVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <VideoPlayer item={modalVideo} autoPlay onClose={() => setModalVideo(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b shadow-sm supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 space-y-3">
          
          {/* Top Row: Back & Title */}
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={() => router.back()}>
                 <ArrowLeft className="h-5 w-5" />
             </Button>
             <h1 className="text-lg font-semibold truncate leading-none">
                {categoryTitle || <Skeleton className="h-5 w-32" />}
             </h1>
             {/* Desktop Update Button */}
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleUpdate} 
                disabled={loadingUpdate} 
                className="hidden sm:flex ml-auto text-xs h-8 gap-2"
             >
                <RefreshCw className={cn("h-3.5 w-3.5", loadingUpdate && "animate-spin")} />
                {loadingUpdate ? "Atualizando..." : "Verificar Novos"}
             </Button>
          </div>

          {/* Bottom Row: Search & Controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Pesquisar vídeo..."
                 className="pl-9 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            
            <div className="bg-muted/50 p-1 rounded-md flex items-center border border-transparent">
               <Button
                 variant={viewMode === "grid" ? "secondary" : "ghost"}
                 size="icon"
                 className="h-8 w-8 rounded-sm"
                 onClick={() => setViewMode("grid")}
               >
                 <LayoutGrid className="h-4 w-4" />
               </Button>
               <Button
                 variant={viewMode === "list" ? "secondary" : "ghost"}
                 size="icon"
                 className="h-8 w-8 rounded-sm"
                 onClick={() => setViewMode("list")}
               >
                 <ListIcon className="h-4 w-4" />
               </Button>
            </div>

            {/* Mobile Update Icon */}
            <Button 
                variant="outline" 
                size="icon" 
                onClick={handleUpdate} 
                disabled={loadingUpdate} 
                className="sm:hidden h-10 w-10 shrink-0"
             >
                <RefreshCw className={cn("h-4 w-4", loadingUpdate && "animate-spin")} />
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <motion.div
          layout
          className={cn(
            "grid gap-4",
            viewMode === "grid" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1 max-w-3xl mx-auto"
          )}
        >
          {initialLoading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className={cn("rounded-xl overflow-hidden border bg-card", viewMode === "list" && "flex h-28")}>
                 <Skeleton className={cn("bg-muted", viewMode === "grid" ? "aspect-video w-full" : "w-40 h-full shrink-0")} />
                 <div className="p-4 space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                 </div>
              </div>
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const saved = savedMap.get(item.id)
                const importedAsNote = !!saved?.importedAsNote
                const isPlayingInline = playingId === item.id && viewMode === "grid"

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all",
                      viewMode === "list" && "flex flex-row items-stretch"
                    )}
                  >
                    {/* --- Media Area --- */}
                    <div className={cn(
                      "relative bg-muted overflow-hidden shrink-0",
                      viewMode === "grid" ? "aspect-video w-full" : "w-32 sm:w-48 h-auto min-h-[100px]"
                    )}>
                      {isPlayingInline ? (
                        <VideoPlayer item={item} autoPlay onClose={() => setPlayingId(null)} />
                      ) : (
                        <>
                          {item.coverImage ? (
                            <img 
                              src={item.coverImage} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer" 
                              loading="lazy"
                              onClick={() => handlePlay(item)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                              <LayoutGrid className="h-8 w-8 opacity-20" />
                            </div>
                          )}
                          
                          {/* Play Overlay */}
                          <div 
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center cursor-pointer"
                            onClick={() => handlePlay(item)}
                          >
                             <div className="bg-white/90 text-black rounded-full p-2.5 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg">
                                <Play className="h-5 w-5 fill-current pl-0.5" />
                             </div>
                          </div>
                          
                          {/* Duration Badge */}
                          {item.durationFormatted && (
                              <Badge variant="secondary" className="absolute bottom-1.5 right-1.5 h-5 px-1.5 text-[10px] bg-black/70 text-white border-0 gap-1 backdrop-blur-sm pointer-events-none">
                                  <Clock className="w-3 h-3" /> {item.durationFormatted}
                              </Badge>
                          )}
                        </>
                      )}
                    </div>

                    {/* --- Content Area --- */}
                    <div className={cn(
                      "flex flex-col justify-between flex-1",
                      viewMode === "grid" ? "p-3 sm:p-4 gap-3" : "p-3 sm:p-4 gap-2"
                    )}>
                      <div className="space-y-1">
                         <h3 className={cn(
                           "font-semibold leading-tight line-clamp-2",
                           viewMode === "list" ? "text-base" : "text-sm sm:text-base"
                         )}>
                           {item.title}
                         </h3>
                         {/* Optional: Add category or date here if available */}
                      </div>

                      <div className={cn(
                         "flex items-center gap-2 mt-auto",
                         viewMode === "grid" ? "w-full" : "w-auto self-start"
                      )}>
                        <Button
                          variant={importedAsNote ? "outline" : "default"}
                          size="sm"
                          className={cn(
                             "h-8 text-xs font-medium flex-1 shadow-sm",
                             importedAsNote && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40"
                          )}
                          onClick={() => (importedAsNote ? handleOpenNote(item) : handleImportNote(item))}
                          disabled={!userId}
                        >
                          {importedAsNote ? (
                             <>
                               <Check className="h-3.5 w-3.5 mr-1.5" /> Ver Nota
                             </>
                          ) : (
                             <>
                               <FileText className="h-3.5 w-3.5 mr-1.5" /> Importar
                             </>
                          )}
                        </Button>
                        
                        {viewMode === "list" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handlePlay(item)}>
                                <Play className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}

          {!initialLoading && filteredItems.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
               <div className="bg-muted p-4 rounded-full mb-3">
                  <Search className="h-6 w-6 opacity-50" />
               </div>
               <p>Nenhum vídeo encontrado.</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
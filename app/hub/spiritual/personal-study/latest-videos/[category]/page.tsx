"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, LayoutGrid, List, Search, Play, FileText, Check, X, ArrowLeft } from "lucide-react"
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
        const group = groups.find(g => g.key === categoryKey)
        if (group) {
          setCategoryTitle(group.title)
          setApiItems(group.videos)
        } else {
            // Fallback if category not found or encoded differently
            // Maybe the key is URL encoded?
            const decoded = decodeURIComponent(categoryKey)
            const groupDecoded = groups.find(g => g.key === decoded)
            if (groupDecoded) {
                setCategoryTitle(groupDecoded.title)
                setApiItems(groupDecoded.videos)
            }
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
          toast.success(`Novos vídeos encontrados: ${newCount}`)
        } else {
          toast.info("Você já está atualizado")
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
      toast.info("A nota vinculada não existe mais. Você pode importar novamente.")
      return
    }
    return
  }

  const handlePlay = (item: VideoData) => {
    if (viewMode === "grid") {
      setPlayingId(item.id)
    } else {
      setModalVideo(item)
    }
  }

  // Componente de Vídeo Reutilizável
  const VideoPlayer = ({ item, autoPlay = false, onClose }: { item: VideoData, autoPlay?: boolean, onClose?: () => void }) => (
    <div className="relative w-full h-full bg-black group">
      <video 
        src={item.videoUrl} 
        className="w-full h-full object-contain" 
        controls 
        autoPlay={autoPlay}
        playsInline
      >
        {item.subtitlesUrl && <track kind="subtitles" src={item.subtitlesUrl} label="Português" default />}
        Seu navegador não suporta este vídeo.
      </video>
      {onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 relative">
      <AnimatePresence>
        {modalVideo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setModalVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <VideoPlayer item={modalVideo} autoPlay onClose={() => setModalVideo(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between sticky -top-4 z-40 bg-background/95 backdrop-blur py-2 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{categoryTitle || "Carregando..."}</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Assista aos vídeos, acompanhe novos lançamentos e crie notas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar título..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="bg-muted p-1 rounded-md flex items-center border">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleUpdate} disabled={loadingUpdate} className="flex-1 sm:flex-none">
              {loadingUpdate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Atualizando
                </>
              ) : (
                "Atualizar"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <motion.div
        variants={containerVariants}
        initial={false}
        animate="show"
        className={cn(
          "grid gap-4",
          viewMode === "grid" 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        )}
      >
        {initialLoading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
                viewMode === "list" && "flex flex-row items-center gap-4 p-3 h-auto"
              )}
            >
              <div
                className={cn(
                  "relative bg-muted overflow-hidden shrink-0",
                  viewMode === "grid" ? "aspect-video w-full" : "h-20 w-32 rounded-lg"
                )}
              >
                <Skeleton className="w-full h-full" />
              </div>
              <div
                className={cn(
                  "flex flex-col flex-1",
                  viewMode === "grid" ? "p-4 space-y-3" : "pr-2 gap-1"
                )}
              >
                <Skeleton className={cn(viewMode === "list" ? "h-4 w-48" : "h-5 w-3/4")} />
                <div
                  className={cn(
                    "flex items-center gap-2 mt-auto pt-2",
                    viewMode === "list" && "pt-0"
                  )}
                >
                  {viewMode === "list" && <Skeleton className="h-8 w-24" />}
                  <Skeleton className={cn("h-8", viewMode === "grid" ? "w-full" : "w-24")} />
                </div>
              </div>
            </div>
          ))
        ) : (
        <>
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const saved = savedMap.get(item.id)
            const importedAsNote = !!saved?.importedAsNote
            const isPlayingInline = playingId === item.id && viewMode === "grid"

            return (
              <motion.div
                layout
                variants={itemVariants}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
                  !isPlayingInline && "hover:shadow-md hover:border-primary/20",
                  viewMode === "list" && "flex flex-col items-center gap-4 p-3 h-auto"
                )}
              >
                {/* Área de Mídia (Capa ou Vídeo) */}
                <div className={cn(
                  "relative bg-muted overflow-hidden shrink-0",
                  viewMode === "grid" ? "aspect-video w-full" : "h-20 w-32 rounded-lg"
                )}>
                  {isPlayingInline ? (
                    <VideoPlayer item={item} autoPlay onClose={() => setPlayingId(null)} />
                  ) : (
                    <>
                      {item.coverImage ? (
                        <img 
                          src={item.coverImage} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <LayoutGrid className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      
                      {/* Botão de Play (Overlay) */}
                      {item.videoUrl && (
                        <div 
                          className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center cursor-pointer"
                          onClick={() => handlePlay(item)}
                        >
                          <div className="bg-white/20 hover:bg-white/40 text-white rounded-full p-3 backdrop-blur-sm transition-all scale-90 group-hover:scale-100 shadow-lg">
                            <Play className="h-6 w-6 fill-current pl-1" />
                          </div>
                        </div>
                      )}
                      
                      {/* Duração */}
                      {item.durationFormatted && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                              {item.durationFormatted}
                          </div>
                      )}
                    </>
                  )}
                </div>

                {/* Conteúdo do Texto e Ações */}
                <div className={cn(
                  "flex flex-col flex-1",
                  viewMode === "grid" ? "p-4 space-y-3" : "flex flex-col items-center pr-2 gap-1"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn(
                      "font-semibold leading-tight",
                      viewMode === "list" ? "text-base" : "text-lg text-center"
                    )}>
                      {item.title}
                    </h3>
                    
                    {importedAsNote && (
                       <div title="Nota criada" className="shrink-0 text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 p-1 rounded-full">
                         <Check className="h-3 w-3" />
                       </div>
                    )}
                  </div>

                  <div className={cn(
                    "flex items-center gap-2 mt-auto pt-2",
                    viewMode === "list" && "pt-0"
                  )}>
                    {viewMode === "list" && item.videoUrl && (
                      <Button variant="outline" size="sm" onClick={() => handlePlay(item)} className="h-8 text-xs">
                        <Play className="h-3 w-3 mr-1.5" /> Assistir
                      </Button>
                    )}

                    <Button
                      variant={importedAsNote ? "secondary" : "default"}
                      size="sm"
                      className={cn("text-xs h-8", viewMode === "grid" && "w-full")}
                      onClick={() => (importedAsNote ? handleOpenNote(item) : handleImportNote(item))}
                      disabled={!userId || (!item.subtitlesUrl && !saved)}
                    >
                      <FileText className="h-3 w-3 mr-1.5" /> 
                      {importedAsNote ? "Ver Nota" : "Importar"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {!loadingUpdate && filteredItems.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="col-span-full py-12 text-center text-muted-foreground"
          >
            <p>Nenhum vídeo encontrado nesta categoria.</p>
          </motion.div>
        )}
        </>
        )}
      </motion.div>
    </div>
  )
}

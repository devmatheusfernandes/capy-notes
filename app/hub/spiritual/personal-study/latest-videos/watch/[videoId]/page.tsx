"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, FileText, Share2, Clock, Tag, ChevronDown, ChevronUp } from "lucide-react"
import { formatVttToText, getVideoById, type VideoData } from "@/lib/all-videos"
import { createNote } from "@/lib/notes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"

export default function WatchVideoPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.videoId as string
  
  const [video, setVideo] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [creatingNote, setCreatingNote] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!videoId) return

    const loadVideo = async () => {
      try {
        const data = await getVideoById(videoId)
        if (data) {
          // Se não tiver texto de conteúdo, tenta buscar legendas
          if (!data.contentText && data.subtitlesUrl) {
            try {
              const res = await fetch(data.subtitlesUrl)
              const vtt = await res.text()
              data.contentText = formatVttToText(vtt)
            } catch (err) {
              console.error("Error loading subtitles:", err)
            }
          }
          setVideo(data)
        }
      } catch (err) {
        console.error("Error loading video:", err)
        toast.error("Erro ao carregar o vídeo.")
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
  }, [videoId])

  const handleCreateNote = async () => {
    if (!user || !video) {
        toast.error("Você precisa estar logado para criar notas.")
        return
    }

    setCreatingNote(true)
    try {
      const content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: video.title }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: `Link original: ${video.videoUrl || video.subtitlesUrl || "N/A"}` }]
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Anotações do Estudo" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Comece suas anotações aqui..." }]
          },
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "Transcrição Automática" }]
          },
          ...video.contentText?.split("\n\n").map(para => ({
            type: "paragraph",
            content: [{ type: "text", text: para }]
          })) || []
        ]
      }

      const note = await createNote(user.uid, {
        title: `Estudo: ${video.title}`,
        content: content as any
      })

      toast.success("Nota criada e salva no seu caderno!")
      router.push(`/hub/notes/${note.id}`)
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("Erro ao criar nota.")
    } finally {
      setCreatingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <Skeleton className="w-full max-w-4xl aspect-video rounded-xl" />
        <div className="w-full max-w-4xl space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center p-6">
        <div className="bg-muted p-6 rounded-full">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
        </div>
        <div>
            <h2 className="text-xl font-bold">Vídeo não encontrado</h2>
            <p className="text-muted-foreground mt-2">O conteúdo que você procura pode ter sido removido.</p>
        </div>
        <Button onClick={() => router.back()} variant="outline">Voltar para Biblioteca</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Compacto */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold truncate flex-1 opacity-90">{video.title}</h1>
          <Button variant="ghost" size="icon" onClick={() => {
             navigator.clipboard.writeText(window.location.href)
             toast.success("Link copiado!")
          }}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-8 lg:p-6">
          
          {/* Coluna Principal: Vídeo e Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Player Container - Edge-to-edge on Mobile */}
            <div className="w-full bg-black sm:rounded-xl overflow-hidden shadow-xl aspect-video relative group">
              {video.videoUrl ? (
                <video 
                  src={video.videoUrl} 
                  controls 
                  poster={video.coverImage}
                  className="w-full h-full object-contain"
                  playsInline
                >
                  {video.subtitlesUrl && (
                    <track kind="subtitles" src={video.subtitlesUrl} srcLang="pt" label="Português" default />
                  )}
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/70 bg-zinc-900">
                  <p>Vídeo indisponível para reprodução.</p>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="px-4 sm:px-0 space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold leading-tight mb-2">{video.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="gap-1 rounded-md px-2">
                        <Clock className="w-3 h-3" /> {video.durationFormatted}
                    </Badge>
                    <Badge variant="outline" className="gap-1 rounded-md px-2 border-muted-foreground/20">
                        <Tag className="w-3 h-3" /> {video.primaryCategory}
                    </Badge>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-3 py-2">
                 <Button 
                    onClick={handleCreateNote} 
                    disabled={creatingNote}
                    className="flex-1 sm:flex-none gap-2 shadow-sm font-medium"
                    size="lg"
                  >
                    {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Salvar como nota
                  </Button>
              </div>

              <Separator />
            </div>
          </div>

          {/* Coluna Lateral: Transcrição (Sticky on Desktop) */}
          <div className="lg:col-span-1 px-4 sm:px-0 lg:px-0">
            <div className="lg:sticky lg:top-20 space-y-4">
                <Card className="border-muted shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-120px)] pt-0!">
                    <CardHeader className="pt-6 pb-2 px-4 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                            <FileText className="h-4 w-4 text-primary" /> 
                            Transcrição do Vídeo
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border">
                            Gerada automaticamente
                        </span>
                    </CardHeader>
                    
                    <CardContent className="p-0 flex-1 relative bg-card">
                        <ScrollArea className="h-[400px] lg:h-[calc(100vh-200px)] w-full">
                            <div className="p-4 sm:p-5">
                                {video.contentText ? (
                                    <article className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-p:text-muted-foreground prose-headings:text-foreground">
                                        {video.contentText.split("\n\n").map((para, i) => (
                                            <p key={i} className="mb-4 last:mb-0 text-sm sm:text-base text-justify">
                                                {para}
                                            </p>
                                        ))}
                                    </article>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2 opacity-60">
                                        <FileText className="h-8 w-8 mb-2" />
                                        <p className="text-sm">Transcrição indisponível.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        {/* Fade effect at bottom for mobile hint */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none lg:hidden" />
                    </CardContent>
                </Card>

                {/* Mobile Tip */}
                <p className="text-xs text-center text-muted-foreground/60 pb-8 lg:hidden">
                    Role dentro da caixa para ler o texto completo.
                </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
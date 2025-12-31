"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { CATEGORY_NAMES, getAllVideosGrouped, searchVideosByToken, type CategoryGroup, type VideoData } from "@/lib/all-videos"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Film, 
  PlayCircle, 
  Search, 
  Loader2, 
  ArrowUpRight, 
  SlidersHorizontal, 
  X,
  Clock,
  CheckSquare,
  Square,
  RefreshCw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "use-debounce"
import { cn } from "@/lib/utils" 
import { Progress } from "@/components/ui/progress"

// --- Helper Functions ---

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeStr(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function splitIntoParagraphs(text: string) {
  return text.split(/\n\s*\n/)
}

function splitIntoSentences(text: string) {
  return text.match(/[^.!?]+[.!?]+/g) || [text]
}

function HighlightedSnippet({ text, term }: { text?: string, term: string }) {
  if (!text) return null
  
  // Parse da query para identificar termos exatos e não exatos (mesma lógica da busca)
  const regex = /(['"])(.*?)\1|(\S+)/g;
  const cleanQuery = term.replace(/[,\.]/g, " ")
  const parsedTerms: { term: string, exact: boolean }[] = []
  let match
  while ((match = regex.exec(cleanQuery)) !== null) {
      if (match[2] && match[2].trim()) {
          parsedTerms.push({ term: match[2].trim(), exact: true })
      } else if (match[3] && match[3].trim()) {
          parsedTerms.push({ term: match[3].trim(), exact: false })
      }
  }

  const normText = normalizeStr(text)
  
  // Encontrar a melhor posição para mostrar o snippet
  let index = -1
  
  // Tenta encontrar o primeiro termo (dando prioridade para exatos)
  for (const t of parsedTerms) {
      const normT = normalizeStr(t.term)
      if (t.exact) {
        try {
            const r = new RegExp(`\\b${escapeRegExp(normT)}\\b`)
            const m = r.exec(normText)
            if (m) {
                index = m.index
                break
            }
        } catch {}
      } else {
          const idx = normText.indexOf(normT)
          if (idx !== -1) {
              index = idx
              break
          }
      }
  }
  
  if (index === -1) return <span className="text-white/70 text-xs line-clamp-2">{text.slice(0, 100)}...</span>

  // Calcula tamanho total dos termos para estimar o final do snippet
  const totalTermsLength = parsedTerms.reduce((acc, t) => acc + t.term.length, 0)
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + totalTermsLength + 60)
  
  const prefix = start > 0 ? "..." : ""
  const suffix = end < text.length ? "..." : ""
  
  const originalSnippet = text.slice(start, end)
  
  // Cria a regex de destaque combinando todos os termos
  // Para exatos, usa \b. Para não exatos, apenas o termo.
  const partsRegex = parsedTerms.map(t => {
      const esc = escapeRegExp(t.term)
      // Se for exato, usa word boundary na regex de split para garantir que quebre certo?
      // Na verdade, para o split funcionar bem com highlight, precisamos capturar o termo.
      // O desafio é que o split consome o separador.
      // Vamos fazer uma regex única com captura groups
      if (t.exact) return `\\b${esc}\\b`
      return esc
  }).join("|")
  
  const splitRegex = new RegExp(`(${partsRegex})`, 'gi')
  const parts = originalSnippet.split(splitRegex)

  return (
    <span className="text-white/80 text-xs leading-relaxed line-clamp-2 shadow-black drop-shadow-md">
      {prefix}
      {parts.map((part, i) => {
        // Verifica match para colorir
        const normPart = normalizeStr(part)
        
        const isMatch = parsedTerms.some(t => {
            const normT = normalizeStr(t.term)
            if (t.exact) {
                return new RegExp(`^${escapeRegExp(normT)}$`, 'i').test(normPart)
            }
            return new RegExp(escapeRegExp(normT), 'i').test(normPart)
        })

        if (isMatch) {
           return <span key={i} className="bg-yellow-500/80 text-white font-bold px-0.5 rounded">{part}</span>
        }
        return part
      })}
      {suffix}
    </span>
  )
}

// --- Main Component ---

type SearchScope = "text" | "paragraph" | "sentence"

export default function LatestVideosPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery] = useDebounce(searchQuery, 500)
  const [searchResults, setSearchResults] = useState<VideoData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Filter State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchScope, setSearchScope] = useState<SearchScope>("text")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Update State
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [updateProgress, setUpdateProgress] = useState({
    status: 'idle', // idle, running, done, error
    verified: 0,
    saved: 0,
    total: 0,
    currentVideo: '',
  })

  // Load initial data
  useEffect(() => {
    ;(async () => {
      try {
        const groups = await getAllVideosGrouped()
        setCategories(groups)
        // Default to all selected
        setSelectedCategories(groups.map(g => g.key))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Derived State
  const allVideos = useMemo(() => categories.flatMap(g => g.videos), [categories])
  const categoryTitleMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach(c => map[c.key] = c.title)
    return map
  }, [categories])
  
  const isAllCategoriesSelected = categories.length > 0 && selectedCategories.length === categories.length
  
  const hasSearchTerm = debouncedQuery.length >= 2
  const showResults = hasSearchTerm || !isAllCategoriesSelected

  // Filter Logic
  const displayedVideos = useMemo(() => {
    let baseList = hasSearchTerm ? searchResults : allVideos
    return baseList.filter(v => selectedCategories.includes(v.categoryKey))
  }, [hasSearchTerm, searchResults, allVideos, selectedCategories])

  // Search Logic
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const search = async () => {
      setIsSearching(true)
      try {
        // Parse da query para identificar termos exatos e não exatos
        // Regex para capturar:
        // 1. Texto entre aspas (simples ou duplas) -> Grupo 2
        // 2. Palavras soltas (sem aspas) -> Grupo 3
        const regex = /(['"])(.*?)\1|(\S+)/g;
        
        // Substituir vírgulas e pontos por espaços para separar palavras, mas não dentro de aspas (simplificação)
        // Como o regex já lida com espaços, vamos apenas remover vírgulas soltas
        const cleanQuery = debouncedQuery.replace(/[,\.]/g, " ")
        
        const parsedTerms: { term: string, exact: boolean }[] = []
        let match
        while ((match = regex.exec(cleanQuery)) !== null) {
            if (match[2] && match[2].trim()) {
                parsedTerms.push({ term: match[2].trim(), exact: true })
            } else if (match[3] && match[3].trim()) {
                parsedTerms.push({ term: match[3].trim(), exact: false })
            }
        }

        // Se não encontrou nada (ex: string vazia), retorna
        if (parsedTerms.length === 0) {
            setSearchResults([])
            setIsSearching(false)
            return
        }

        // Para a busca no backend, usamos todos os termos combinados
        // Se houver termos exatos, removemos as aspas para buscar os tokens
        const queryToUse = parsedTerms.map(t => t.term).join(" ")
        
        const rawResults = await searchVideosByToken(queryToUse)
        
        // Normaliza os termos para comparação
        const normalizedParsedTerms = parsedTerms.map(t => ({
            term: normalizeStr(t.term),
            exact: t.exact
        }))
        
        const filtered = rawResults.filter(video => {
          const content = video.contentText || ""
          const normContent = normalizeStr(content)

          const checkTerm = (text: string, termObj: { term: string, exact: boolean }) => {
              if (termObj.exact) {
                  // Busca exata com word boundary
                  try {
                      return new RegExp(`\\b${escapeRegExp(termObj.term)}\\b`).test(text)
                  } catch {
                      return false
                  }
              }
              return text.includes(termObj.term)
          }

          if (searchScope === "text") {
            return normalizedParsedTerms.every(t => checkTerm(normContent, t))
          }
          if (searchScope === "paragraph") {
            const paragraphs = splitIntoParagraphs(content)
            return paragraphs.some(para => {
              const normPara = normalizeStr(para)
              return normalizedParsedTerms.every(t => checkTerm(normPara, t))
            })
          }
          if (searchScope === "sentence") {
            const sentences = splitIntoSentences(content)
            return sentences.some(sent => {
              const normSent = normalizeStr(sent)
              return normalizedParsedTerms.every(t => checkTerm(normSent, t))
            })
          }
          return true
        })

        setSearchResults(filtered)
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setIsSearching(false)
      }
    }

    search()
  }, [debouncedQuery, searchScope])

  // --- Handlers ---

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => {
      if (isAllCategoriesSelected) {
        return [key]
      }
      if (prev.length === 1 && prev.includes(key)) {
        return categories.map(c => c.key)
      }
      return prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    })
  }
  
  const selectAllCategories = () => setSelectedCategories(categories.map(c => c.key))
  const deselectAllCategories = () => setSelectedCategories([])

  const runUpdate = async () => {
    // Cancela anterior se houver
    if (abortControllerRef.current) {
        abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    setUpdateProgress({ status: 'running', verified: 0, saved: 0, total: 0, currentVideo: 'Iniciando...' })
    setIsUpdateDialogOpen(true)

    try {
      const res = await fetch('/api/videos/update', { 
          method: 'POST',
          signal: controller.signal
      })
      if (!res.body) throw new Error("Sem resposta do servidor")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'videos_fetched') {
               setUpdateProgress(prev => ({ ...prev, total: data.count }))
            } else if (data.type === 'progress') {
               setUpdateProgress(prev => ({ 
                 ...prev, 
                 verified: data.verified, 
                 saved: data.new,
                 currentVideo: data.current
               }))
            } else if (data.type === 'done') {
               setUpdateProgress(prev => ({ ...prev, status: 'done', currentVideo: 'Concluído!' }))
               
            }
          } catch (e) { console.error(e) }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
         setUpdateProgress(prev => ({ ...prev, status: 'aborted', currentVideo: 'Cancelado pelo usuário.' }))
      } else {
         console.error(err)
         setUpdateProgress(prev => ({ ...prev, status: 'error', currentVideo: 'Erro ao atualizar.' }))
      }
    } finally {
        abortControllerRef.current = null
    }
  }

  const cancelUpdate = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort()
      }
  }

  // --- Render Components ---

  const SidebarContent = () => (
    <div className="space-y-6 pb-6 px-1">
      {/* Search Scope */}
      <div className="space-y-4">
        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
           Escopo da Pesquisa
        </h3>
        <RadioGroup value={searchScope} onValueChange={(v) => setSearchScope(v as SearchScope)} className="gap-3">
          <div className="flex items-center space-x-3 border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSearchScope("text")}>
            <RadioGroupItem value="text" id="scope-text" />
            <div className="grid gap-0.5">
                <Label htmlFor="scope-text" className="font-medium cursor-pointer">Texto Completo</Label>
                <span className="text-xs text-muted-foreground">Palavras em qualquer lugar</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSearchScope("paragraph")}>
            <RadioGroupItem value="paragraph" id="scope-paragraph" />
             <div className="grid gap-0.5">
                <Label htmlFor="scope-paragraph" className="font-medium cursor-pointer">Mesmo Parágrafo</Label>
                <span className="text-xs text-muted-foreground">Maior contexto</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSearchScope("sentence")}>
            <RadioGroupItem value="sentence" id="scope-sentence" />
             <div className="grid gap-0.5">
                <Label htmlFor="scope-sentence" className="font-medium cursor-pointer">Mesma Frase</Label>
                <span className="text-xs text-muted-foreground">Contexto exato</span>
            </div>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />

      {/* Checkbox List */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3">
           <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Filtro Detalhado</h3>
           
           {/* Actions Buttons */}
           <div className="flex items-center gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllCategories} 
                className="flex-1 h-8 text-xs gap-1.5"
                disabled={isAllCategoriesSelected}
             >
                <CheckSquare className="w-3 h-3" /> Marcar todas
             </Button>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={deselectAllCategories} 
                className="flex-1 h-8 text-xs gap-1.5"
                disabled={selectedCategories.length === 0}
             >
                <Square className="w-3 h-3" /> Desmarcar todas
             </Button>
           </div>
        </div>

        <ScrollArea className="h-[300px] border rounded-md p-2">
             <div className="space-y-1">
             {categories.map((group) => (
                <div key={group.key} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                  <Checkbox 
                    id={`cat-${group.key}`} 
                    checked={selectedCategories.includes(group.key)}
                    onCheckedChange={(checked) => {
                        if (checked) {
                            setSelectedCategories(prev => [...prev, group.key])
                        } else {
                            setSelectedCategories(prev => prev.filter(k => k !== group.key))
                        }
                    }}
                  />
                  <Label htmlFor={`cat-${group.key}`} className="text-sm font-normal cursor-pointer w-full select-none">
                    {group.title}
                  </Label>
                </div>
              ))}
             </div>
        </ScrollArea>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header - Removed excessive gaps */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto pt-3 pb-2 px-4 sm:px-6 space-y-2">
          
          {/* Top Row: Search & Filter Trigger */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="pl-9 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all rounded-lg shadow-sm text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <Button 
                variant="outline" 
                size="icon" 
                className="hidden h-10 w-10 shrink-0 rounded-lg border-muted-foreground/20 bg-background"
                onClick={runUpdate}
                title="Atualizar Biblioteca"
            >
                <RefreshCw className={cn("h-4 w-4", updateProgress.status === 'running' && "animate-spin")} />
            </Button>

            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-lg border-muted-foreground/20 bg-background">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px] pt-10 px-4">
                <SheetHeader className="text-left mb-4">
                  <SheetTitle>Opções de Pesquisa</SheetTitle>
                  <SheetDescription>Refine como e onde você busca o conteúdo.</SheetDescription>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>

          {/* Bottom Row: Horizontal Category Chips */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
             <ScrollArea orientation="horizontal" className="w-full whitespace-nowrap">
                <div className="flex space-x-2 pb-2">
                    <Badge 
                        variant={isAllCategoriesSelected ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer text-xs sm:text-sm px-3 py-1 h-7 rounded-full transition-all select-none border-dashed", 
                            !isAllCategoriesSelected && "bg-transparent hover:bg-muted text-muted-foreground border-muted-foreground/30"
                        )}
                        onClick={selectAllCategories}
                    >
                        Todos
                    </Badge>
                    {loading ? (
                        Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-24 rounded-full" />
                        ))
                    ) : (
                        categories.map((group) => {
                            const isSelected = !isAllCategoriesSelected && selectedCategories.includes(group.key)
                            return (
                                <Badge 
                                    key={group.key}
                                    variant={isSelected ? "default" : "secondary"}
                                    className={cn(
                                        "cursor-pointer text-xs sm:text-sm px-3 py-1 h-7 rounded-full transition-all select-none font-normal",
                                        !isSelected && "bg-transparent hover:bg-muted border border-transparent text-muted-foreground"
                                    )}
                                    onClick={() => toggleCategory(group.key)}
                                >
                                    {group.title}
                                </Badge>
                            )
                        })
                    )}
                </div>
                <ScrollBar orientation="horizontal" className="invisible sm:visible" />
             </ScrollArea>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Status Indicators */}
        <div className="mb-4 flex items-center justify-between">
           <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground/80">
               {isSearching ? "Pesquisando..." : showResults ? "Resultados encontrados" : "Biblioteca de Vídeos"}
           </h1>
           {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        {/* Content Grid */}
        <div className="min-h-[500px]">
          {loading ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                 {[...Array(8)].map((_, i) => (
                   <Skeleton key={i} className="h-64 sm:h-56 w-full rounded-xl" />
                 ))}
              </div>
          ) : showResults ? (
            <motion.div
              layout
              className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
               <AnimatePresence mode="popLayout">
               {displayedVideos.map((video) => (
                 <motion.div
                   layout
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.2 }}
                   key={video.id}
                   className="group cursor-pointer relative"
                   onClick={() => router.push(`/hub/spiritual/personal-study/latest-videos/watch/${video.id}`)}
                 >
                   {/* Full Card Cover Image Design */}
                   <Card className="h-64 sm:h-56 w-full relative overflow-hidden border-0 shadow-md group-hover:shadow-xl transition-all rounded-xl">
                      {/* Background Image */}
                      {video.coverImage ? (
                         <img 
                           src={video.coverImage} 
                           alt={video.title}
                           className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                         />
                      ) : (
                         <div className="absolute inset-0 w-full h-full bg-zinc-800 flex items-center justify-center">
                            <PlayCircle className="h-10 w-10 text-white/20" />
                         </div>
                      )}

                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                         <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm border-0 text-[10px] h-5 px-1.5">
                            {categoryTitleMap[video.categoryKey] || video.primaryCategory}
                         </Badge>
                      </div>

                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-black/60 text-white hover:bg-black/70 border-0 h-5 px-1.5 text-[10px] gap-1">
                           <Clock className="w-3 h-3" /> {video.durationFormatted}
                        </Badge>
                      </div>

                      {/* Bottom Content */}
                      <div className="absolute bottom-0 left-0 w-full p-4 z-10 flex flex-col justify-end">
                         <h3 className="text-white font-bold text-base leading-snug line-clamp-2 mb-1 drop-shadow-md">
                           {video.title}
                         </h3>
                         
                         {hasSearchTerm && (
                            <div className="mt-1">
                               <HighlightedSnippet text={video.contentText} term={debouncedQuery} />
                            </div>
                         )}
                      </div>
                   </Card>
                 </motion.div>
               ))}
               </AnimatePresence>

               {!isSearching && displayedVideos.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center">
                   <div className="bg-muted/30 p-6 rounded-full mb-4">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                   </div>
                   <p className="text-lg font-medium text-foreground">Nenhum vídeo encontrado</p>
                   <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                     Tente ajustar os filtros na barra lateral ou buscar por outros termos.
                   </p>
                   <Button variant="link" onClick={selectAllCategories} className="mt-4">
                     Limpar filtros
                   </Button>
                 </div>
               )}
            </motion.div>
          ) : (
            /* Category Browser (Default View) */
            <div className="space-y-8">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                >
                        {categories.map((cat) => (
                        <Card 
                            key={cat.key} 
                            className="h-56 relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all cursor-pointer group rounded-xl"
                            onClick={() => router.push(`/hub/spiritual/personal-study/latest-videos/${cat.key}`)}
                        >
                            Background Image
                            {cat.videos[0]?.coverImage ? (
                                <img 
                                    src={cat.videos[0].coverImage} 
                                    alt={cat.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="absolute inset-0 w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <Film className="h-10 w-10 text-white/20" />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 p-5 w-full z-10">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{cat.videos.length} Vídeos</span>
                                    <ArrowUpRight className="h-4 w-4 text-white opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                                </div>
                                <h3 className="text-white font-bold text-xl leading-tight mb-1 drop-shadow-lg">{cat.title}</h3>
                                <p className="text-white/70 text-xs line-clamp-1">
                                    Último: {cat.videos[0]?.title}
                                </p>
                            </div>
                        </Card>
                        ))}
                    </motion.div>
            </div>
          )}
        </div>
      </main>

      {/* Update Progress Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atualizando Biblioteca</DialogTitle>
            <DialogDescription>
              Verificando vídeos e baixando novos conteúdos...
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
             <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Progresso</span>
                   <span className="font-medium">{updateProgress.verified} / {updateProgress.total || '?'}</span>
                </div>
                {/* Simple progress bar calculation */}
                <Progress value={updateProgress.total ? (updateProgress.verified / updateProgress.total) * 100 : 0} />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                   <div className="text-2xl font-bold">{updateProgress.saved}</div>
                   <div className="text-xs text-muted-foreground">Novos Salvos</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                   <div className="text-2xl font-bold">{updateProgress.verified}</div>
                   <div className="text-xs text-muted-foreground">Verificados</div>
                </div>
             </div>

             <div className="bg-muted/30 p-2 rounded text-xs font-mono h-20 overflow-y-auto border">
                {updateProgress.currentVideo ? (
                    <p className="truncate">Processando: {updateProgress.currentVideo}</p>
                ) : (
                    <p className="text-muted-foreground">Aguardando início...</p>
                )}
                {updateProgress.status === 'done' && <p className="text-green-500 font-bold mt-2">Concluído!</p>}
                {updateProgress.status === 'error' && <p className="text-red-500 font-bold mt-2">Erro!</p>}
             </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
             {updateProgress.status === 'running' && (
                 <Button 
                    variant="destructive" 
                    onClick={cancelUpdate}
                 >
                    Cancelar
                 </Button>
             )}
             <Button 
                variant={updateProgress.status === 'running' ? "outline" : "default"}
                onClick={() => setIsUpdateDialogOpen(false)} 
                disabled={updateProgress.status === 'running'}
             >
                {updateProgress.status === 'running' ? 'Executando...' : 'Fechar'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

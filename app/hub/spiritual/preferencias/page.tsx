"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area" // Certifique-se de ter este componente ou use div com overflow
import { Trash2, Plus, Search, Book, AlertCircle, Settings } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, setDoc } from "firebase/firestore"
import { BOOK_ABBREVIATIONS, setCustomAbbreviations } from "@/lib/bible-abbreviations-pt"
import { useCurrentUserId } from "@/hooks/notes"
import { PageHeader } from "@/components/ui/page-header"
import Capysettings from "../../../../public/images/capy-images/capysettings.png"
import { motion, AnimatePresence } from "framer-motion"

// --- Componente Skeleton ---
function PreferencesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="grid gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

export default function PreferenciasPage() {
  const userId = useCurrentUserId()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("biblia")

  const [books, setBooks] = useState<string[]>([])
  const [customAbbrevs, setCustomAbbrevs] = useState<Record<string, string>>({})

  const [newAbbrev, setNewAbbrev] = useState("")
  const [newBook, setNewBook] = useState("")
  const [abbrFilter, setAbbrFilter] = useState("")

  useEffect(() => {
    // Carregar lista de livros
    if (activeTab === "biblia") {
      ;(async () => {
        try {
          const res = await fetch("/api/bible")
          const data = await res.json()
          setBooks(data.books || [])
        } catch {
          /* noop */
        }
      })()
    }

    if (!userId) {
        setLoading(false)
        return
    }

    // Carregar configurações do Firebase
    const settingsRef = doc(db, "users", userId, "meta", "settings")
    const unsub = onSnapshot(settingsRef, (snap) => {
      const data = snap.data() as { customAbbreviations?: Record<string, string> } | undefined
      const map = data?.customAbbreviations || {}
      setCustomAbbrevs(map)
      setCustomAbbreviations(map)
      setLoading(false)
    })
    return () => unsub()
  }, [activeTab, userId])

  const addCustomAbbrev = async () => {
    if (!userId) return
    const key = newAbbrev.trim().toLowerCase().replace(/\.$/, "")
    const value = newBook.trim()
    
    if (!key || !value) return toast.error("Informe abreviação e selecione um livro")
    if (BOOK_ABBREVIATIONS[key]) return toast.error("Essa abreviação já existe (padrão)")
    if (customAbbrevs[key]) return toast.error("Essa abreviação já existe (personalizada)")
    
    const settingsRef = doc(db, "users", userId, "meta", "settings")
    const next = { ...customAbbrevs, [key]: value }
    
    try {
      await setDoc(settingsRef, { customAbbreviations: next, updatedAt: new Date().toISOString() }, { merge: true })
      setNewAbbrev("")
      setNewBook("")
      toast.success("Abreviação adicionada com sucesso!")
    } catch (e) {
      toast.error("Erro ao salvar abreviação")
    }
  }

  const removeCustomAbbrev = async (key: string) => {
    if (!userId) return
    const next = { ...customAbbrevs }
    delete next[key]
    const settingsRef = doc(db, "users", userId, "meta", "settings")
    await setDoc(settingsRef, { customAbbreviations: next, updatedAt: new Date().toISOString() }, { merge: true })
    toast.success("Abreviação removida")
  }

  const sortedEntries = useMemo(() => {
    return Object.entries(customAbbrevs).sort((a, b) => a[0].localeCompare(b[0]))
  }, [customAbbrevs])

  const existingAbbrevs = useMemo(() => {
    const all = new Map<string, { type: "padrão" | "personalizada"; book: string }>()
    Object.entries(BOOK_ABBREVIATIONS).forEach(([k, v]) => all.set(k, { type: "padrão", book: v }))
    Object.entries(customAbbrevs).forEach(([k, v]) => all.set(k, { type: "personalizada", book: v }))
    const arr = Array.from(all.entries())
    const filtered = abbrFilter.trim()
      ? arr.filter(([k, v]) => k.includes(abbrFilter.trim().toLowerCase()) || v.book.toLowerCase().includes(abbrFilter.trim().toLowerCase()))
      : arr
    return filtered.sort((a, b) => a[0].localeCompare(b[0]))
  }, [customAbbrevs, abbrFilter])

  const duplicateStatus = useMemo(() => {
    const key = newAbbrev.trim().toLowerCase().replace(/\.$/, "")
    if (!key) return null
    if (customAbbrevs[key]) return "personalizada"
    if (BOOK_ABBREVIATIONS[key]) return "padrão"
    return null
  }, [newAbbrev, customAbbrevs])

  if (loading) {
    return (
        <div className="page-container p-4 max-w-5xl mx-auto">
            <PreferencesSkeleton />
        </div>
    )
  }

  return (
    <div className="page-container p-4 max-w-5xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          title="Preferências de Estudo"
          subtitle="Personalize suas abreviações e configure o comportamento da Bíblia."
          image={Capysettings}
        />
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="biblia" className="gap-2">
            <Book className="h-4 w-4" />
            Bíblia
          </TabsTrigger>
          <TabsTrigger value="geral" disabled className="gap-2 opacity-50">
             <Settings className="h-4 w-4" />
             Geral (Em breve)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biblia" className="space-y-8">
          
          {/* Section: Add New */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-primary/20 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Abreviação
                </CardTitle>
                <CardDescription>
                  Ensine o sistema a reconhecer seus atalhos pessoais (ex: "1 pe" → "1 Pedro").
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                  <div className="w-full md:w-1/3 space-y-2">
                    <label className="text-sm font-medium">Abreviação</label>
                    <Input
                      placeholder="Ex.: 1 pe"
                      value={newAbbrev}
                      onChange={(e) => setNewAbbrev(e.target.value)}
                      className={duplicateStatus ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {duplicateStatus && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Já existe como abreviação {duplicateStatus}.
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="w-full md:w-1/3 space-y-2">
                    <label className="text-sm font-medium">Livro Correspondente</label>
                    <Select value={newBook} onValueChange={setNewBook}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um livro" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {books.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full md:w-auto pt-2 md:pt-0">
                    <Button 
                        onClick={addCustomAbbrev} 
                        disabled={!userId || !!duplicateStatus || !newAbbrev || !newBook}
                        className="w-full md:w-auto"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: Custom List */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">Suas Abreviações</h3>
                <Badge variant="outline" className="text-xs">{sortedEntries.length}</Badge>
              </div>
              
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {sortedEntries.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                            <Book className="h-5 w-5 opacity-50" />
                        </div>
                        Você ainda não criou nenhuma abreviação personalizada.
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y">
                        <AnimatePresence initial={false}>
                            {sortedEntries.map(([abbr, book]) => (
                            <motion.div
                                key={abbr}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary">
                                    {abbr}
                                </span>
                                <span className="text-sm text-foreground/80">
                                    {book}
                                </span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeCustomAbbrev(abbr)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
              </div>
            </motion.div>

            {/* Column 2: Reference List */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
            >
               <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight">Biblioteca Completa</h3>
                <div className="relative w-full max-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Filtrar..." 
                        className="h-8 pl-8 text-xs"
                        value={abbrFilter}
                        onChange={(e) => setAbbrFilter(e.target.value)}
                    />
                </div>
              </div>

              <Card className="overflow-hidden">
                <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                        {existingAbbrevs.length > 0 ? (
                            existingAbbrevs.map(([abbr, info]) => (
                                <div key={abbr} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {abbr}
                                        </span>
                                        <span>{info.book}</span>
                                    </div>
                                    <Badge variant={info.type === 'padrão' ? "secondary" : "outline"} className="text-[10px] h-5">
                                        {info.type}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                Nenhuma abreviação encontrada.
                            </div>
                        )}
                    </div>
                </ScrollArea>
              </Card>
            </motion.div>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  )
}
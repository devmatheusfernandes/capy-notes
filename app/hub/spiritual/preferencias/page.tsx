"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, setDoc } from "firebase/firestore"
import { BOOK_ABBREVIATIONS, setCustomAbbreviations } from "@/lib/bible-abbreviations-pt"
import { useCurrentUserId } from "@/hooks/notes"
import { PageHeader } from "@/components/ui/page-header"
import Capysettings from "../../../../public/images/capy-images/capysettings.png"

export default function PreferenciasPage() {
  const userId = useCurrentUserId()
  const [activeTab, setActiveTab] = useState<string>("biblia")

  const [books, setBooks] = useState<string[]>([])
  const [customAbbrevs, setCustomAbbrevs] = useState<Record<string, string>>({})

  const [newAbbrev, setNewAbbrev] = useState("")
  const [newBook, setNewBook] = useState("")
  const [abbrFilter, setAbbrFilter] = useState("")

  useEffect(() => {
    if (activeTab !== "biblia") return
    ;(async () => {
      try {
        const res = await fetch("/api/bible")
        const data = await res.json()
        setBooks(data.books || [])
      } catch {
        /* noop */
      }
    })()

    if (!userId) return
    const settingsRef = doc(db, "users", userId, "meta", "settings")
    const unsub = onSnapshot(settingsRef, (snap) => {
      const data = snap.data() as { customAbbreviations?: Record<string, string> } | undefined
      const map = data?.customAbbreviations || {}
      setCustomAbbrevs(map)
      setCustomAbbreviations(map)
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
    await setDoc(settingsRef, { customAbbreviations: next, updatedAt: new Date().toISOString() }, { merge: true })
    setNewAbbrev("")
    setNewBook("")
    toast.success("Abreviação adicionada")
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
      ? arr.filter(([k]) => k.includes(abbrFilter.trim().toLowerCase()))
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

  return (
    <div className="page-container">
      <PageHeader
        title="Preferências"
        subtitle="Abreviações e configurações para estudo bíblico"
        image={Capysettings}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="biblia">Bíblia</TabsTrigger>
        </TabsList>

        <TabsContent value="biblia" className="page-section">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Abreviações Personalizadas</h2>
            <p className="text-sm text-muted-foreground">
              Crie abreviações para normalizar referências bíblicas. Ex.: "1 pe" → "1 Pedro".
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Abreviação</label>
              <Input
                placeholder="Ex.: 1 pe"
                value={newAbbrev}
                onChange={(e) => setNewAbbrev(e.target.value)}
              />
              {duplicateStatus && (
                <p className="text-xs text-destructive mt-1">Já existe ({duplicateStatus}).</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Livro</label>
              <Select value={newBook} onValueChange={setNewBook}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um livro" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex">
              <Button className="ml-auto" onClick={addCustomAbbrev} disabled={!userId || !!duplicateStatus}>
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Personalizadas</h3>
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma abreviação personalizada.</p>
            ) : (
              <div className="divide-y rounded border">
                {sortedEntries.map(([abbr, book]) => (
                  <div key={abbr} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        {abbr}
                      </span>
                      <span className="text-sm">{book}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeCustomAbbrev(abbr)}>
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Existentes (padrão e personalizadas)</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Filtrar abreviações"
                  value={abbrFilter}
                  onChange={(e) => setAbbrFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="divide-y rounded border">
              {existingAbbrevs.map(([abbr, info]) => (
                <div key={abbr} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
                      {abbr}
                    </span>
                    <span className="text-sm">{info.book}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{info.type}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

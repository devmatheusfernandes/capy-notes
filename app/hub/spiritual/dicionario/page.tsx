"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Book, Volume2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type StrongResult = {
  id: string
  originalId: string
  lemma: string
  transliteration: string
  pronunciation: string
  definition: string
  usage?: string
  derivation?: string
  type: 'greek' | 'hebrew'
}

export default function DicionarioPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StrongResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    setResults([])

    try {
      const res = await fetch(`/api/strongs?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar")
      }

      setResults(data.results || [])
    } catch (error) {
      console.error(error)
      toast.error("Erro ao buscar no dicionário")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dicionário Strong</h1>
        <p className="text-muted-foreground">
          Pesquise por palavras em grego ou hebraico, ou use o código Strong (ex: G1, H1234).
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Digite uma palavra ou código Strong (ex: G25, Amor, Shalom)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Pesquisar</span>
        </Button>
      </form>

      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum resultado encontrado para "{query}"
          </div>
        )}

        {results.map((item) => (
          <div 
            key={`${item.type}-${item.id}`} 
            className="border rounded-lg p-6 space-y-4 bg-card text-card-foreground shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full",
                    item.type === 'greek' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  )}>
                    {item.id}
                  </span>
                  <h2 className="text-2xl font-serif font-bold">{item.lemma}</h2>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="italic">{item.transliteration}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    {item.pronunciation}
                  </span>
                </div>
              </div>
              <Book className="h-5 w-5 text-muted-foreground opacity-20" />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-1">Definição</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-3 rounded-md">
                  {item.definition}
                </p>
              </div>

              {item.derivation && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Origem</h3>
                  <p className="text-sm text-muted-foreground">{item.derivation}</p>
                </div>
              )}

              {item.usage && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Uso na KJV / Tradução</h3>
                  <p className="text-sm italic text-muted-foreground">{item.usage}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

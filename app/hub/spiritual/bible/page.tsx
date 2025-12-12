"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {  ChevronLeft, Loader2, Search, X } from "lucide-react";

// Helper para destacar o termo buscado no texto
function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) return text;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      <span key={i} className="bg-yellow-500/30 text-yellow-600 dark:text-yellow-300 font-semibold rounded-[2px] px-0.5">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// --- Tipos ---
type ChapterContent = { verse: number; text: string }[];

export default function BibliaJWDarkStylePage() {
  return (
    <Suspense fallback={null}>
      <BibleContent />
    </Suspense>
  );
}

function BibleContent() {
  const params = useSearchParams();
  const router = useRouter();

  // Estados de Dados
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [content, setContent] = useState<ChapterContent>([]);
  const [notes, setNotes] = useState<string | null>(null);

  // Estados de Navegação
  const [view, setView] = useState<"books" | "chapters" | "reader">("books");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  
  // Estados de Busca e UI
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // --- Carregamento Inicial ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bible");
        const data = await res.json();
        setBooks(data.books || []);
        
        // Deep linking (se abrir direto com parametros na URL)
        const urlBook = params.get("book");
        const urlChapter = params.get("chapter");
        const urlVerse = params.get("verse");

        if (urlBook && urlChapter) {
          setSelectedBook(urlBook);
          setSelectedChapter(Number(urlChapter));
          setView("reader");
          if (urlVerse) setHighlightedVerse(Number(urlVerse));
        }
      } catch {
        setError("Falha ao carregar biblioteca.");
      }
    })();
  }, []);

  // --- Carregar Capítulos ---
  useEffect(() => {
    if (!selectedBook) return;
    (async () => {
      try {
        const res = await fetch(`/api/bible?book=${encodeURIComponent(selectedBook)}`);
        const data = await res.json();
        setChapters(data.chapters || []);
      } catch {
        setError("Erro ao carregar capítulos.");
      }
    })();
  }, [selectedBook]);

  // --- Carregar Texto ---
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    
    const q = new URLSearchParams();
    q.set("book", selectedBook);
    q.set("chapter", String(selectedChapter));
    router.replace(`?${q.toString()}`, { scroll: false });

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/bible?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}`
        );
        const data = await res.json();
        setContent(data.content || []);
        setNotes(data.notes ?? null);
        setError(null);
      } catch {
        setError("Erro ao carregar texto.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedBook, selectedChapter, router]);

  // --- Scroll para Versículo ---
  useEffect(() => {
    if (view === "reader" && highlightedVerse && !loading && content.length > 0) {
      const el = document.querySelector(`[data-verse="${highlightedVerse}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const t = setTimeout(() => setHighlightedVerse(null), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [view, highlightedVerse, loading, content]);

  // Sincroniza painel de busca com parâmetro de URL
  useEffect(() => {
    const isOpen = params.get("search") === "1";
    setShowSearch(isOpen);
  }, [params]);

  // Sincroniza navegação (books/chapters/reader) com parâmetros da URL
  useEffect(() => {
    const urlBook = params.get("book");
    const urlChapter = params.get("chapter");
    if (!urlBook && !urlChapter) {
      setView("books");
      setSelectedBook("");
      setSelectedChapter(null);
      return;
    }
    if (urlBook && !urlChapter) {
      setSelectedBook(urlBook);
      setSelectedChapter(null);
      setView("chapters");
      return;
    }
    if (urlBook && urlChapter) {
      setSelectedBook(urlBook);
      setSelectedChapter(Number(urlChapter));
      setView("reader");
    }
  }, [params]);

  // --- Helpers de Navegação ---
  const handleBookClick = (book: string) => {
    setSelectedBook(book);
    setView("chapters");
    const q = new URLSearchParams(Array.from(params.entries()));
    q.set("book", book);
    q.delete("chapter");
    q.delete("verse");
    router.push(`?${q.toString()}`, { scroll: false });
  };

  const handleChapterClick = (chapter: number) => {
    setSelectedChapter(chapter);
    setView("reader");
  };

  const handleBack = () => {
    if (view === "reader") setView("chapters");
    else if (view === "chapters") setView("books");
  };

  // Separação das escrituras (39 VT, 27 NT)
  const hebrewScriptures = books.slice(0, 39);
  const greekScriptures = books.slice(39);

  // --- Busca ---
  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/bible/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      // erro silencioso
    } finally {
      setSearching(false);
    }
  }

  return (
    // Fundo escuro global (Dark Mode Nativo)
    <div className="flex flex-col h-screen bg-[#111] text-white overflow-hidden font-sans">


      {/* --- CONTEÚDO --- */}
      <div className="flex-1 overflow-y-auto bg-background relative no-scrollbar">
        
        {/* Painel de Busca Aprimorado */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-lg overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Área do Input */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar livro, capítulo ou texto..."
                      className="pl-9 pr-8 h-10 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    {query && (
                      <button
                        onClick={() => {
                          setQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={() => setShowSearch(false)} 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-foreground px-2"
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Área de Resultados e Estados */}
                <div className="max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  
                  {/* Estado: Carregando */}
                  {searching && (
                    <div className="py-8 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs font-medium">Pesquisando nas escrituras...</span>
                    </div>
                  )}

                  {/* Estado: Nenhum Resultado */}
                  {!searching && query && searchResults.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      <p className="text-sm">Nenhum resultado encontrado para "{query}"</p>
                    </div>
                  )}

                  {/* Estado: Lista de Resultados */}
                  {!searching && searchResults.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                        Resultados ({searchResults.length})
                      </span>
                      {searchResults.map((r, i) => (
                        <motion.button
                          key={`${r.book}-${r.chapter}-${r.verse}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => {
                            setSelectedBook(r.book);
                            setSelectedChapter(r.chapter);
                            setHighlightedVerse(r.verse);
                            setView("reader");
                            setShowSearch(false);
                          }}
                          className="flex flex-col items-start w-full p-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/40 last:border-0 group text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {r.book} {r.chapter}:{r.verse}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 leading-relaxed">
                            {highlightText(r.text, query)}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- VIEW 1: GRADE DE LIVROS  --- */}
        {view === "books" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-1 sm:p-2 pb-20 max-w-[1100px] mx-auto">
            
            {/* Escrituras Hebraicas */}
            <div className="mb-4">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 px-1 mt-2">
                Escrituras Hebraico-Aramaicas
              </h2>
              {/* Grid responsivo: 2 colunas mobile, 3 desktop (similar ao print) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px] ">
                {hebrewScriptures.map((book) => (
                  <button
                    key={book}
                    onClick={() => handleBookClick(book)}
                    className="h-12 bg-primary hover:bg-primary/80 text-white flex items-center justify-between px-3 text-sm font-medium transition-colors group"
                  >
                    <span>{book}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Escrituras Gregas */}
            <div>
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 px-1 mt-4">
                Escrituras Gregas Cristãs
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
                {greekScriptures.map((book) => (
                  <button
                    key={book}
                    onClick={() => handleBookClick(book)}
                    className="h-12 bg-primary hover:bg-primary/80 text-white text-white flex items-center justify-between px-3 text-sm font-medium transition-colors group"
                  >
                     <span>{book}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- VIEW 2: GRADE DE CAPÍTULOS --- */}
        {view === "chapters" && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-4 max-w-[1100px] mx-auto">
            <h2 className="text-xl font-bold mb-4 text-white">
              O Livro de {selectedBook}
            </h2>
            <p className="text-sm font-bold text-gray-400 mb-2">Capítulos</p>
            
            {/* Grid de números azuis sólidos */}
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-[1px] max-w-2xl">
              {chapters.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChapterClick(c)}
                  className="aspect-square bg-primary hover:bg-primary/80 text-white text-white flex items-center justify-center text-lg font-medium transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* --- VIEW 3: LEITURA --- */}
        {view === "reader" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-[1100px] mx-auto min-h-full">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">{error}</div>
            ) : (
              
              <div className="p-4">
                    {/* Navegação Rodapé */}
                <div className="flex justify-between mb-6 ">
                    <Button 
                      variant="ghost" 
                      className="text-primary/80 hover:text-primary hover:bg-primary-foreground"
                      disabled={selectedChapter === 1}
                      onClick={() => handleChapterClick(selectedChapter! - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1"/> Anterior
                    </Button>
                    <h2 className="text-2xl font-bold mb-6 text-center text-foreground">{selectedBook} {selectedChapter}</h2>
                    <Button 
                      variant="ghost"
                      className="text-primary/80 hover:text-primary hover:bg-primary-foreground"
                      onClick={() => handleChapterClick(selectedChapter! + 1)}
                    >
                      Próximo <ChevronLeft className="w-4 h-4 ml-1 rotate-180"/>
                    </Button>
                </div>
                
                <div className="space-y-1 text-lg leading-relaxed text-foreground font-serif">
                  {content.map((v) => (
                    <span 
                      key={v.verse} 
                      data-verse={v.verse}
                      className={`relative inline px-[2px] rounded transition-colors duration-500 ${
                        highlightedVerse === v.verse ? "bg-yellow-900/50 text-yellow-100" : ""
                      }`}
                    >
                      <sup className="text-xs font-bold text-primary mr-1 opacity-80 select-none">
                        {v.verse}
                      </sup>
                      {v.text}{" "}
                    </span>
                  ))}
                </div>
                
            
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

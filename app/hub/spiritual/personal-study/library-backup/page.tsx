"use client";

import { useEffect, useState, useMemo } from "react";
import { useJwlEditor, Note } from "@/hooks/useJwlEditor";
import { useCloudBackups, BackupMetadata } from "@/hooks/useCloudBackups";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, Cloud, Edit, Trash2, ArrowLeft, Save, Download, 
  Merge, Plus, Search, Tag as TagIcon, MoreVertical, Settings, 
  FileJson, Filter, X, Check, ChevronsUpDown, LayoutGrid, List
} from "lucide-react";
import { cn } from "@/lib/utils";

// Cores do JW
const JW_COLORS = [
  { id: 0, name: "Cinza", bg: "bg-gray-100 dark:bg-zinc-800", border: "border-gray-400", dot: "bg-gray-400" },
  { id: 1, name: "Amarelo", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-400", dot: "bg-yellow-400" },
  { id: 2, name: "Verde", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-400", dot: "bg-green-400" },
  { id: 3, name: "Azul", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-400", dot: "bg-blue-400" },
  { id: 4, name: "Rosa", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-400", dot: "bg-pink-400" },
  { id: 5, name: "Laranja", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-400", dot: "bg-orange-400" },
  { id: 6, name: "Roxo", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-400", dot: "bg-purple-400" },
];

export default function CloudBackupPage() {
  const [user, setUser] = useState<any>(null);
  
  const { 
    loadFile, notes, allTags,
    createNote, updateNote, deleteNote, renameTag, deleteTag,
    generateUpdatedBlob, mergeBackup, createEmptyBackup,
    isMerging, hasLoaded 
  } = useJwlEditor();
  
  const { backups, importBackup, saveChanges, fetchBackupFile, deleteBackup, fetchBackups, loadingList } = useCloudBackups();

  // Estados de Navegação
  const [activeBackup, setActiveBackup] = useState<BackupMetadata | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Modais e Sheets
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isTagComboboxOpen, setIsTagComboboxOpen] = useState(false);

  // Edição de Nota (Estado)
  const [editingNote, setEditingNote] = useState<Note | null>(null); // NULL = Criação
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState<string>("0");
  
  // Tag Management no Editor
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Array de strings das tags selecionadas

  // Edição Tag (Renomear/Deletar Globalmente)
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchBackups();
    });
    return () => unsub();
  }, []);

  // --- Handlers Básicos ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      toast.promise(importBackup(e.target.files[0]), {
        loading: 'Enviando...', success: 'Importado!', error: 'Erro ao importar.'
      });
    }
  };

  const handleCreateNew = async () => {
    try {
      await createEmptyBackup();
      setActiveBackup({
        id: "new-temp",
        name: "Novo Backup",
        storagePath: "",
        updatedAt: new Date().toISOString()
      });
      toast.success("Novo backup criado!");
    } catch (e) {
      toast.error("Erro ao criar backup.");
    }
  };

  const openEditor = async (backup: BackupMetadata) => {
    const toastId = toast.loading("Abrindo backup...");
    try {
      const blob = await fetchBackupFile(backup.storagePath);
      if (!blob) throw new Error("Erro download");
      await loadFile(blob);
      setActiveBackup(backup);
      toast.dismiss(toastId);
    } catch {
      toast.error("Erro ao abrir.", { id: toastId });
    }
  };

  const handleCloudSave = async () => {
    if (!activeBackup) return;
    setIsSavingCloud(true);
    try {
      const newBlob = await generateUpdatedBlob();
      if (newBlob) {
        const result = await saveChanges(
          activeBackup.id, 
          activeBackup.storagePath, 
          newBlob,
          activeBackup.id === "new-temp" ? "meu_novo_backup.jwlibrary" : undefined
        );
        
        if (result) {
          // Se era um backup novo, atualiza o estado local com o ID real e path
          if (activeBackup.id === "new-temp") {
            setActiveBackup(prev => prev ? ({
              ...prev,
              id: result.id,
              storagePath: result.storagePath,
              name: "meu_novo_backup", // Atualiza nome visualmente também
              updatedAt: new Date().toISOString()
            }) : null);
          }
          toast.success("Salvo na nuvem!");
        }
      }
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSavingCloud(false); }
  };

  // --- Lógica de Criação e Edição ---

  const handleOpenNewNote = () => {
    setEditingNote(null); // Modo Criação
    setEditTitle("");
    setEditContent("");
    setEditColor("0");
    setSelectedTags([]);
    setIsNoteSheetOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note); // Modo Edição
    setEditContent(note.Content || "");
    setEditTitle(note.Title || "");
    setEditColor(note.ColorIndex.toString());
    setSelectedTags([...note.Tags]); // Copia o array de tags
    setIsNoteSheetOpen(true);
  };

  const saveNoteChanges = () => {
    const toastId = toast.loading("Salvando nota...");
    try {
      const cleanTags = selectedTags.map(t => t.trim()).filter(Boolean);
      if (editingNote) {
        updateNote(editingNote.NoteId, editContent, editTitle, parseInt(editColor), cleanTags);
        toast.success("Nota atualizada!", { id: toastId });
      } else {
        createNote(editTitle, editContent, parseInt(editColor), cleanTags);
        toast.success("Nota criada com sucesso!", { id: toastId });
      }
      setIsNoteSheetOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar nota.", { id: toastId });
    }
  };

  const handleDeleteNote = (noteId: number) => {
    toast("Excluir nota?", {
      action: { label: "Excluir", onClick: () => { deleteNote(noteId); toast.success("Nota excluída."); } }
    });
  };

  // --- Gerenciamento Global de Tags ---
  const handleUpdateTag = (tagId: number) => {
    if(!editingTagName.trim()) return;
    renameTag(tagId, editingTagName);
    setEditingTagId(null);
    toast.success("Tag renomeada");
  };

  const handleDeleteTag = (tagId: number) => {
    if(confirm("Remover tag de todas as notas?")) {
      deleteTag(tagId);
      toast.success("Tag removida");
    }
  };

  // --- Lógica de Seleção de Tags no Editor ---
  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    );
  };

  // --- Filtros ---
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = 
        (note.Title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (note.Content?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (note.Tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
      const matchesColor = colorFilter === "all" || note.ColorIndex.toString() === colorFilter;
      const matchesTags = tagFilter.length === 0 || tagFilter.some(t => note.Tags.includes(t));
      return matchesSearch && matchesColor && matchesTags;
    });
  }, [notes, searchTerm, colorFilter, tagFilter]);

  if (!user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Login necessário.</div>;

  // ==========================================
  // VIEW: EDITOR DE NOTAS (Estilo Moderno)
  // ==========================================
  if (activeBackup && hasLoaded) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden p-4">
        
        {/* Header Fixo */}
        <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setActiveBackup(null)} className="-ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col">
                <span className="font-semibold text-sm max-w-[120px] sm:max-w-xs truncate">{activeBackup.name}</span>
                <span className="text-[10px] text-muted-foreground">{notes.length} notas</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* BOTÃO NOVA NOTA (Destacado) */}
              <Button onClick={handleOpenNewNote} size="sm" className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="mr-2 h-4 w-4"/> Nova Nota
              </Button>
              <Button onClick={handleOpenNewNote} size="icon" className="sm:hidden bg-blue-600 hover:bg-blue-700 text-white rounded-full h-8 w-8">
                <Plus className="h-4 w-4"/>
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSearchMobile(!showSearchMobile)}
                className={cn("text-muted-foreground", (searchTerm || showSearchMobile) && "text-primary")}
              >
                <Search className="h-5 w-5" />
              </Button>

              <div className="hidden sm:flex items-center border rounded-md bg-background mr-1">
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8 rounded-none" 
                  onClick={() => setViewMode('grid')}
                  title="Visualização em Grade"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border" />
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8 rounded-none" 
                  onClick={() => setViewMode('list')}
                  title="Visualização em Lista"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleCloudSave} disabled={isSavingCloud}>
                    {isSavingCloud ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Salvar na Nuvem
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsTagsModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4"/> Gerenciar Tags Globais
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                     <label className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".jwlibrary"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            toast.promise(mergeBackup(file), {
                              loading: "Mesclando backup...",
                              success: "Backup mesclado!",
                              error: "Erro ao mesclar backup",
                            })
                            e.currentTarget.value = ""
                          }}
                          disabled={isMerging}
                        />
                        {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Merge className="mr-2 h-4 w-4"/>}
                        Mesclar Backup
                     </label>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                     const blob = await generateUpdatedBlob();
                     if(blob) saveAs(blob, `${activeBackup.name}_editado.jwlibrary`);
                  }}>
                    <Download className="mr-2 h-4 w-4"/> Exportar Arquivo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Barra de Busca e Filtros Expansível */}
          <AnimatePresence>
            {(showSearchMobile || searchTerm) && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }} 
                 animate={{ height: "auto", opacity: 1 }} 
                 exit={{ height: 0, opacity: 0 }}
                 className="px-4 pb-3 overflow-hidden border-b"
               >
                 <div className="relative mb-3">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Buscar em títulos, conteúdo ou tags..." 
                     className="pl-9 h-9" 
                     value={searchTerm} 
                     onChange={e => setSearchTerm(e.target.value)}
                     autoFocus
                   />
                   {searchTerm && (
                     <button onClick={() => setSearchTerm("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                       <X className="h-4 w-4" />
                     </button>
                   )}
                 </div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Filtros de Cor */}
          <div className="px-4 pb-2 pt-2 overflow-x-auto no-scrollbar border-b bg-background">
            <div className="flex gap-3 min-w-max">
               <button 
                 onClick={() => setColorFilter("all")}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                   colorFilter === "all" ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border"
                 )}
               >
                 <Filter className="w-3 h-3" /> Todas
               </button>
               {JW_COLORS.map(c => (
                 <button
                   key={c.id}
                   onClick={() => setColorFilter(c.id.toString())}
                   className={cn(
                     "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all",
                     colorFilter === c.id.toString() 
                       ? `bg-background ring-1 ring-offset-1 ring-${c.border.split('-')[1]}-500 ${c.border}` 
                       : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                   )}
                 >
                   <div className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                   {c.name}
                 </button>
               ))}
            </div>
          </div>

          {/* Filtros de Tags */}
          <div className="px-4 pb-2 pt-2 overflow-x-auto no-scrollbar border-b bg-background">
            <div className="flex gap-2 min-w-max items-center">
              <TagIcon className="w-3 h-3 text-muted-foreground" />
              {allTags.map((t) => {
                const active = tagFilter.includes(t.Name);
                return (
                  <button
                    key={t.TagId}
                    onClick={() => {
                      setTagFilter((prev) => prev.includes(t.Name) ? prev.filter((n) => n !== t.Name) : [...prev, t.Name]);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      active ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border"
                    )}
                  >
                    #{t.Name}
                  </button>
                );
              })}
              {tagFilter.length > 0 && (
                <button
                  onClick={() => setTagFilter([])}
                  className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className={cn(
            "max-w-7xl mx-auto pb-20",
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-2"
          )}>
            {filteredNotes.length > 0 ? filteredNotes.map((note) => {
              const colorObj = JW_COLORS.find(c => c.id === note.ColorIndex) || JW_COLORS[0];
              
              if (viewMode === 'list') {
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={note.NoteId}
                  >
                     <Card
                       className={cn(
                         "group relative flex flex-row items-center overflow-hidden border transition-all hover:shadow-md cursor-pointer min-h-[60px]",
                         "hover:border-primary/20",
                         colorObj.bg
                       )}
                       onClick={() => handleEditNote(note)}
                     >
                       <div className={cn("absolute left-0 top-0 bottom-0 w-1", colorObj.dot)} />
                       
                       <div className="flex-1 flex items-center gap-4 p-3 pl-5">
                          <div className="flex-1 min-w-0">
                             <h3 className="font-semibold text-sm truncate" title={note.Title || ""}>
                               {note.Title || <span className="text-muted-foreground italic">Sem título</span>}
                             </h3>
                             <p className="text-xs text-muted-foreground/80 truncate mt-0.5 font-serif">
                               {note.Content ? note.Content.replace(/\n/g, ' ') : <span className="italic opacity-50">Sem conteúdo...</span>}
                             </p>
                          </div>
                          
                          {note.Tags.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px] justify-end">
                              {note.Tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/50 text-foreground/80 border shadow-sm whitespace-nowrap">
                                  #{tag}
                                </span>
                              ))}
                              {note.Tags.length > 3 && (
                                 <span className="text-[10px] text-muted-foreground">+{note.Tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          <div onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 mobile:opacity-100">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground"/>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditNote(note)}><Edit className="mr-2 h-3 w-3"/> Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteNote(note.NoteId)}><Trash2 className="mr-2 h-3 w-3"/> Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                       </div>
                     </Card>
                  </motion.div>
                );
              }

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={note.NoteId}
                >
                  <Card 
                    className={cn(
                      "group relative flex flex-col h-full overflow-hidden border transition-all hover:shadow-md cursor-pointer",
                      "hover:border-primary/20",
                      colorObj.bg
                    )}
                    onClick={() => handleEditNote(note)}
                  >
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", colorObj.dot)} />
                    <div className="p-4 pl-5 flex flex-col h-full gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2" title={note.Title || ""}>
                          {note.Title || <span className="text-muted-foreground italic">Sem título</span>}
                        </h3>
                        <div onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 mobile:opacity-100">
                                <MoreVertical className="h-3 w-3 text-muted-foreground"/>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditNote(note)}><Edit className="mr-2 h-3 w-3"/> Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteNote(note.NoteId)}><Trash2 className="mr-2 h-3 w-3"/> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground/90 line-clamp-4 whitespace-pre-wrap flex-1 font-serif">
                        {note.Content || <span className="italic opacity-50">Toque para adicionar conteúdo...</span>}
                      </div>
                      {note.Tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-black/5 dark:border-white/5">
                          {note.Tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/50 text-foreground/80 border shadow-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            }) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                 <div className="p-4 rounded-full bg-muted"><Filter className="w-6 h-6 opacity-50"/></div>
                 <p className="text-sm">Nenhuma nota encontrada com estes filtros.</p>
                 <Button variant="link" onClick={() => {setSearchTerm(""); setColorFilter("all"); setTagFilter([])}}>Limpar filtros</Button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* SHEET: EDITAR/CRIAR NOTA (Substitui o Dialog)          */}
        {/* ======================================================= */}
        <Sheet open={isNoteSheetOpen} onOpenChange={setIsNoteSheetOpen}>
          <SheetContent side="right" className="w-[100vw] sm:w-[540px] p-0 flex flex-col gap-0 border-l shadow-2xl">
            {/* Header da Sheet */}
            <SheetHeader className="px-6 py-4 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <div className="flex flex-col">
                <SheetTitle>{editingNote ? "Editar Nota" : "Nova Nota"}</SheetTitle>
                <SheetDescription className="text-xs">
                  {editingNote ? "Faça suas alterações abaixo." : "Crie uma nova nota e adicione tags."}
                </SheetDescription>
              </div>
            </SheetHeader>
             
            {/* Corpo da Sheet */}
            <ScrollArea className="flex-1 px-6 py-6">
              <div className="space-y-6">
                 
                 {/* Título */}
                 <div className="flex flex-row gap-2 justify-around space-y-1 h-full">
                   <Input 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)} 
                      placeholder="Título da Nota"
                      className="p-2 text-xl font-bold border-none shadow-none px-4 focus-visible:ring-0 h-auto placeholder:text-muted-foreground/50 bg-transparent"
                   />
                       <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger className="w-[80px] min-h-full p-2 border-none shadow-none focus:ring-0 bg-transparent">
                    <div className={cn("w-4 h-4 rounded-full mx-auto", JW_COLORS.find(c => c.id.toString() === editColor)?.dot || "bg-gray-400")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {JW_COLORS.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${c.dot}`}/> {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 </div>

                 {/* Tags com Combobox */}
                 <div className="space-y-3">
                   <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Etiquetas</Label>
                   
                   <div className="flex flex-wrap gap-2 mb-2">
                      {selectedTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                          {tag}
                          <button 
                            onClick={() => toggleTagSelection(tag)}
                            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                   </div>

                   <Popover open={isTagComboboxOpen} onOpenChange={setIsTagComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isTagComboboxOpen}
                          className="w-full justify-between text-muted-foreground font-normal"
                        >
                          Adicionar ou selecionar tags...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar tag..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                            <CommandGroup heading="Tags Existentes">
                              {allTags.map((tag) => (
                                <CommandItem
                                  key={tag.TagId}
                                  value={tag.Name}
                                  onSelect={(currentValue) => {
                                    // toggleTagSelection(tag.Name); // Comportamento Toggle
                                    if(!selectedTags.includes(tag.Name)) {
                                       setSelectedTags([...selectedTags, tag.Name])
                                    }
                                    setIsTagComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTags.includes(tag.Name) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {tag.Name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Criar">
                              <CommandItem onSelect={() => {
                                  // Lógica para permitir criar tag digitada (depende de como o CommandInput expõe o value, ou simplificamos apenas listando existentes)
                                  // Simplificação: Neste exemplo focamos em selecionar existentes. 
                                  // Para criar nova via Command, geralmente se usa um input controlado fora ou lógica de 'force mount'.
                                  // Vou manter simples: se não achar, o user pode digitar no input abaixo se preferir ou adicionar funcionalidade de 'Criar "X"'
                                  toast.info("Para criar tag nova, apenas digite e pressione Enter no campo de busca (se implementado custom) ou use o input manual se necessário.");
                              }}>
                                <Plus className="mr-2 h-4 w-4" /> Criar nova tag
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                   </Popover>
                   
                   {/* Fallback de Input Manual caso o user queira criar algo que não existe na lista */}
                   <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Ou digite uma nova e pressione Enter"
                        className="text-sm h-8 bg-muted/20 border-transparent focus:bg-background focus:border-input transition-colors"
                        onKeyDown={(e) => {
                           if(e.key === 'Enter') {
                              const val = e.currentTarget.value.trim();
                              if(val && !selectedTags.includes(val)) {
                                 setSelectedTags([...selectedTags, val]);
                                 e.currentTarget.value = "";
                              }
                           }
                        }}
                      />
                   </div>
                 </div>

                 <div className="h-px bg-border/50" />

                 {/* Conteúdo */}
                 <div className="space-y-2 h-full">
                    <Textarea 
                      value={editContent} 
                      onChange={e => setEditContent(e.target.value)} 
                      placeholder="Comece a digitar sua nota..." 
                      className="min-h-[300px] resize-none border-none shadow-none p-2 focus-visible:ring-0 text-base leading-relaxed font-serif bg-transparent"
                    />
                 </div>
              </div>
            </ScrollArea>

            {/* Footer da Sheet */}
            <SheetFooter className="px-6 py-4 border-t bg-muted/10 sm:justify-between flex-row items-center gap-2">
               {editingNote && (
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteNote(editingNote.NoteId)}>
                     <Trash2 className="h-5 w-5" />
                  </Button>
               )}
               <div className="flex gap-2 ml-auto">
                 <SheetClose asChild>
                   <Button variant="ghost">Cancelar</Button>
                 </SheetClose>
                 <Button onClick={saveNoteChanges} className="bg-blue-600 hover:bg-blue-700 text-white">
                   <Save className="mr-2 h-4 w-4" /> Salvar
                 </Button>
               </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Modal Gerenciar Tags (Dialog Mantido para gestão global) */}
        <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Tags Globais</DialogTitle>
              <DialogDescription>Edite ou exclua tags de todo o backup.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] -mx-6 px-6">
              <div className="space-y-1">
                {allTags.map(tag => (
                  <div key={tag.TagId} className="flex items-center justify-between group py-2 border-b last:border-0 border-dashed">
                    {editingTagId === tag.TagId ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in">
                        <Input 
                          value={editingTagName} 
                          onChange={e => setEditingTagName(e.target.value)} 
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="icon" className="h-8 w-8 text-green-600 shrink-0" variant="ghost" onClick={() => handleUpdateTag(tag.TagId)}>
                          <Save className="h-4 w-4"/>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <TagIcon className="h-3.5 w-3.5 text-primary/50"/>
                          <span className="text-sm">{tag.Name}</span>
                        </div>
                        <div className="flex gap-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => {
                            setEditingTagId(tag.TagId);
                            setEditingTagName(tag.Name);
                          }}>
                            <Edit className="h-3.5 w-3.5"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteTag(tag.TagId)}>
                            <Trash2 className="h-3.5 w-3.5"/>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD (LISTA DE BACKUPS)
  // ==========================================
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                 <Cloud className="h-6 w-6" /> 
              </div>
              Meus Backups
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie e edite seus arquivos .jwlibrary</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateNew} className="relative flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg font-medium hover:bg-zinc-800 transition-colors">
              <Plus className="h-4 w-4" />
              <span>Criar Novo</span>
            </button>
            <label className="group relative cursor-pointer">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg font-medium hover:bg-zinc-800 transition-colors">
                <Download className="h-4 w-4" /> 
                <span>Importar</span>
              </div>
              <input type="file" className="hidden" accept=".jwlibrary" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* Lista de Cards */}
        {loadingList ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground animate-pulse">
            <Cloud className="h-12 w-12 opacity-20"/>
            <p>Sincronizando biblioteca...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {backups.map((bkp, i) => (
                <motion.div
                  key={bkp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    className="group relative cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all duration-300 border-dashed hover:border-solid bg-card/50 hover:bg-card"
                    onClick={() => openEditor(bkp)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                          <FileJson className="h-6 w-6" />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 -mr-2 -mt-2"
                          onClick={(e) => { e.stopPropagation(); deleteBackup(bkp.id, bkp.storagePath); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg leading-tight truncate pr-2">{bkp.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                           Editado em {new Date(bkp.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center text-xs font-medium text-foreground transition-opacity transform translate-y-2 group-hover:translate-y-0">
                        Clique para abrir editor <ArrowLeft className="h-3 w-3 ml-1 rotate-180"/>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {backups.length === 0 && (
               <div className="col-span-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/5">
                 <div className="bg-muted p-4 rounded-full mb-4"><Cloud className="h-8 w-8 opacity-50"/></div>
                 <h3 className="font-semibold text-lg">Nenhum arquivo encontrado</h3>
                 <p className="text-sm max-w-xs mt-1">Importe um arquivo .jwlibrary para começar a editar suas notas e marcações.</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

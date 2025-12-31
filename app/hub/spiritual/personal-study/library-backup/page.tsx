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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, Cloud, Edit, Trash2, ArrowLeft, Save, Download, 
  Merge, Plus, Search, Tag as TagIcon, MoreVertical, Settings, 
  FileJson, Filter, X, Check, ChevronsUpDown, LayoutGrid, List, Pencil,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Definição de Cores do JW (Design System) ---
const JW_COLORS = [
  { id: 0, name: "Cinza", bg: "bg-zinc-50 dark:bg-zinc-900", border: "border-zinc-200 dark:border-zinc-700", dot: "bg-zinc-400", text: "text-zinc-700" },
  { id: 1, name: "Amarelo", bg: "bg-yellow-50/50 dark:bg-yellow-950/10", border: "border-yellow-200 dark:border-yellow-900", dot: "bg-yellow-400", text: "text-yellow-700" },
  { id: 2, name: "Verde", bg: "bg-emerald-50/50 dark:bg-emerald-950/10", border: "border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-400", text: "text-emerald-700" },
  { id: 3, name: "Azul", bg: "bg-sky-50/50 dark:bg-sky-950/10", border: "border-sky-200 dark:border-sky-900", dot: "bg-sky-400", text: "text-sky-700" },
  { id: 4, name: "Rosa", bg: "bg-rose-50/50 dark:bg-rose-950/10", border: "border-rose-200 dark:border-rose-900", dot: "bg-rose-400", text: "text-rose-700" },
  { id: 5, name: "Laranja", bg: "bg-orange-50/50 dark:bg-orange-950/10", border: "border-orange-200 dark:border-orange-900", dot: "bg-orange-400", text: "text-orange-700" },
  { id: 6, name: "Roxo", bg: "bg-violet-50/50 dark:bg-violet-950/10", border: "border-violet-200 dark:border-violet-900", dot: "bg-violet-400", text: "text-violet-700" },
];

export default function CloudBackupPage() {
  const [user, setUser] = useState<any>(null);
  
  const { 
    loadFile, notes, allTags,
    createNote, updateNote, deleteNote, renameTag, deleteTag,
    generateUpdatedBlob, mergeBackup, createEmptyBackup, setBackupName,
    isMerging, hasLoaded 
  } = useJwlEditor();
  
  const { backups, importBackup, saveChanges, fetchBackupFile, deleteBackup, fetchBackups, loadingList, renameCloudBackup } = useCloudBackups();

  // Estados de Navegação
  const [activeBackup, setActiveBackup] = useState<BackupMetadata | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false); // Novo estado para skeleton do editor
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Renomear Backup
  const [isRenamingBackup, setIsRenamingBackup] = useState(false);
  const [backupNameInput, setBackupNameInput] = useState("");
  
  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Modais e Sheets
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isTagComboboxOpen, setIsTagComboboxOpen] = useState(false);
  const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);

  // Edição de Nota (Estado)
  const [noteSaveStatus, setNoteSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedState, setLastSavedState] = useState<string>(""); 

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState<string>("0");
  
  // Tag Management no Editor
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
  useEffect(() => {
    if (saveStatus === 'unsaved' && activeBackup) {
      const timer = setTimeout(async () => {
        setSaveStatus('saving');
        await handleCloudSave(true);
        setSaveStatus('saved');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, activeBackup]);

  const handleGoBack = () => {
    if (saveStatus === 'unsaved') {
      setIsUnsavedChangesDialogOpen(true);
    } else {
      setActiveBackup(null);
    }
  };

  const confirmExit = () => {
    setActiveBackup(null);
    setIsUnsavedChangesDialogOpen(false);
    setSaveStatus('saved');
  };

  const handleRenameSubmit = async () => {
    if (!activeBackup || !backupNameInput.trim()) return;
    try {
        setBackupName(backupNameInput);
        if (activeBackup.id !== "new-temp") {
           await renameCloudBackup(activeBackup.id, backupNameInput);
        }
        setActiveBackup(prev => prev ? ({ ...prev, name: backupNameInput }) : null);
        setIsRenamingBackup(false);
    } catch (e) {
        console.error(e);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      toast.promise(importBackup(e.target.files[0]), {
        loading: 'Enviando arquivo...', success: 'Backup importado com sucesso!', error: 'Erro ao importar o arquivo.'
      });
    }
  };

  const handleCreateNew = async () => {
    try {
      await createEmptyBackup();
      setActiveBackup({
        id: "new-temp", name: "Novo Backup", storagePath: "", updatedAt: new Date().toISOString()
      });
      toast.success("Novo backup criado!");
    } catch (e) {
      toast.error("Erro ao criar backup.");
    }
  };

  const openEditor = async (backup: BackupMetadata) => {
    setIsEditorLoading(true);
    const toastId = toast.loading("Carregando backup...");
    try {
      const blob = await fetchBackupFile(backup.storagePath);
      if (!blob) throw new Error("Erro download");
      await loadFile(blob);
      setActiveBackup(backup);
      toast.dismiss(toastId);
    } catch {
      toast.error("Erro ao abrir.", { id: toastId });
      setActiveBackup(null);
    } finally {
      setIsEditorLoading(false);
    }
  };

  const handleCloudSave = async (silent: boolean = false) => {
    if (!activeBackup) return;
    setIsSavingCloud(true);
    try {
      const newBlob = await generateUpdatedBlob();
      if (newBlob) {
        const result = await saveChanges(
          activeBackup.id, activeBackup.storagePath, newBlob,
          activeBackup.id === "new-temp" ? "meu_novo_backup.jwlibrary" : undefined
        );
        if (result) {
          if (activeBackup.id === "new-temp") {
            setActiveBackup(prev => prev ? ({ ...prev, id: result.id, storagePath: result.storagePath, name: "meu_novo_backup", updatedAt: new Date().toISOString() }) : null);
          }
          if (!silent) toast.success("Alterações salvas na nuvem!");
        }
      }
    } catch { 
       if (!silent) toast.error("Não foi possível salvar."); 
    }
    finally { setIsSavingCloud(false); }
  };

  // --- Lógica de Criação e Edição ---
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setEditTitle("");
    setEditContent("");
    setEditColor("0");
    setSelectedTags([]);
    setLastSavedState(JSON.stringify({title: "", content: "", color: "0", tags: []}));
    setNoteSaveStatus('saved');
    setIsNoteSheetOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.Content || "");
    setEditTitle(note.Title || "");
    setEditColor(note.ColorIndex.toString());
    const tags = [...note.Tags];
    setSelectedTags(tags);
    setLastSavedState(JSON.stringify({ title: note.Title || "", content: note.Content || "", color: note.ColorIndex.toString(), tags: tags }));
    setNoteSaveStatus('saved');
    setIsNoteSheetOpen(true);
  };

  const persistNote = async (isManual: boolean = false) => {
    if (!editTitle && !editContent && !isManual) return;
    
    const currentState = JSON.stringify({ title: editTitle, content: editContent, color: editColor, tags: selectedTags });
    if (!isManual && currentState === lastSavedState) return;

    setNoteSaveStatus('saving');
    const cleanTags = selectedTags.map(t => t.trim()).filter(Boolean);

    try {
        if (editingNote) {
            updateNote(editingNote.NoteId, editContent, editTitle, parseInt(editColor), cleanTags);
        } else {
            const newId = createNote(editTitle, editContent, parseInt(editColor), cleanTags);
            if (newId) {
                 setEditingNote({
                     NoteId: newId, Title: editTitle, Content: editContent, ColorIndex: parseInt(editColor), Tags: cleanTags,
                     LastModified: new Date().toISOString(), BlockType: 0, UserMarkId: 0
                 });
            }
        }
        setLastSavedState(currentState);
        setNoteSaveStatus('saved');
        setSaveStatus('unsaved');
        if (isManual) {
             toast.success("Nota salva!");
             setIsNoteSheetOpen(false);
        }
    } catch (e) {
        console.error(e);
        setNoteSaveStatus('unsaved');
        if (isManual) toast.error("Erro ao salvar nota.");
    }
  };

  useEffect(() => {
     if (!isNoteSheetOpen) return;
     const currentState = JSON.stringify({ title: editTitle, content: editContent, color: editColor, tags: selectedTags });
     setNoteSaveStatus(prev => {
        if (prev === 'saving') return prev;
        return currentState !== lastSavedState ? 'unsaved' : 'saved';
     });
  }, [editTitle, editContent, editColor, selectedTags, lastSavedState, isNoteSheetOpen]);

  useEffect(() => {
      if (!isNoteSheetOpen) return;
      const timer = setTimeout(() => { persistNote(false); }, 2000); 
      return () => clearTimeout(timer);
  }, [editTitle, editContent, editColor, selectedTags, isNoteSheetOpen, editingNote]);

  const handleCloseSheet = async () => {
     if (noteSaveStatus === 'unsaved') await persistNote(true);
     setIsNoteSheetOpen(false);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) handleCloseSheet(); else setIsNoteSheetOpen(true);
  };

  const handleDeleteNote = (noteId: number) => {
    toast("Tem certeza que deseja excluir?", {
      action: { 
        label: "Excluir", 
        onClick: () => { 
           deleteNote(noteId); 
           toast.success("Nota excluída.");
           setSaveStatus('unsaved');
           if(isNoteSheetOpen) setIsNoteSheetOpen(false);
        } 
      }
    });
  };

  // --- Gerenciamento Global de Tags ---
  const handleUpdateTag = (tagId: number) => {
    if(!editingTagName.trim()) return;
    renameTag(tagId, editingTagName);
    setEditingTagId(null);
    toast.success("Tag renomeada");
    setSaveStatus('unsaved');
  };

  const handleDeleteTag = (tagId: number) => {
    if(confirm("Remover tag de todas as notas?")) {
      deleteTag(tagId);
      toast.success("Tag removida");
      setSaveStatus('unsaved');
    }
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
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

  if (!user) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4 text-muted-foreground bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p>Verificando autenticação...</p>
    </div>
  );

  // ==========================================
  // VIEW: EDITOR DE NOTAS
  // ==========================================
  if (activeBackup) {
    // SKELETON LOADING STATE FOR EDITOR
    if (isEditorLoading || !hasLoaded) {
        return (
            <div className="flex flex-col h-screen bg-background p-4 space-y-4">
                <div className="flex items-center justify-between h-14 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                        <div className="w-32 h-6 bg-muted rounded animate-pulse" />
                     </div>
                     <div className="w-20 h-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2 pb-2">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-20 h-8 rounded-full bg-muted animate-pulse" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
                </div>
            </div>
        )
    }

    return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        
        {/* --- Header Fixo --- */}
        <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 h-16 max-w-[1920px] mx-auto">
            
            {/* Esquerda: Voltar e Título */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={handleGoBack} className="shrink-0 hover:bg-muted/50 rounded-full">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <div className="flex flex-col min-w-0 justify-center">
                 {isRenamingBackup ? (
                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                       <Input 
                         value={backupNameInput} 
                         onChange={e => setBackupNameInput(e.target.value)}
                         className="h-8 w-[160px] sm:w-[240px] text-sm"
                         autoFocus
                         onKeyDown={e => {
                           if (e.key === 'Enter') handleRenameSubmit();
                           if (e.key === 'Escape') setIsRenamingBackup(false);
                         }}
                       />
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleRenameSubmit}><Check className="h-4 w-4" /></Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setIsRenamingBackup(false)}><X className="h-4 w-4" /></Button>
                    </div>
                 ) : (
                    <div className="group cursor-pointer min-w-0" onClick={() => { setBackupNameInput(activeBackup.name); setIsRenamingBackup(true); }}>
                       <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-sm sm:text-base truncate max-w-[140px] sm:max-w-md">{activeBackup.name}</h2>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                       </div>
                       
                       {/* Status Badge */}
                       <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                          <span className="text-muted-foreground">{notes.length} nota(s)</span>
                          {saveStatus === 'unsaved' && <span className="text-orange-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>Não salvo</span>}
                          {saveStatus === 'saving' && <span className="text-blue-500 font-medium flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin"/>Salvando...</span>}
                          {saveStatus === 'saved' && <span className="text-green-600/70 font-medium flex items-center gap-1"><Check className="w-2.5 h-2.5"/>Salvo</span>}
                       </div>
                    </div>
                 )}
              </div>
            </div>

            {/* Direita: Ações */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button onClick={handleOpenNewNote} size="sm" className="hidden sm:flex bg-primary text-primary-foreground shadow-sm hover:shadow transition-all">
                <Plus className="mr-2 h-4 w-4"/> Nova Nota
              </Button>
              <Button onClick={handleOpenNewNote} size="icon" className="sm:hidden bg-primary text-primary-foreground rounded-full h-9 w-9 shadow-sm">
                <Plus className="h-5 w-5"/>
              </Button>

              <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

              <Button variant="ghost" size="icon" onClick={() => setShowSearchMobile(!showSearchMobile)} className={cn("text-muted-foreground hover:bg-muted/50 rounded-full", (searchTerm || showSearchMobile) && "text-primary bg-primary/10")}>
                <Search className="h-5 w-5" />
              </Button>

              {/* Toggle View Mode (Desktop only) */}
              <div className="hidden sm:flex bg-muted/30 rounded-lg p-0.5 border">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className={cn("h-7 w-7 rounded-md", viewMode === 'grid' && "shadow-sm")} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className={cn("h-7 w-7 rounded-md", viewMode === 'list' && "shadow-sm")} onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="hover:bg-muted/50 rounded-full"><MoreVertical className="h-5 w-5 text-muted-foreground"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Opções do Arquivo</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsTagsModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4"/> Gerenciar Tags Globais
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                      <label className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer transition-colors">
                        <input type="file" className="hidden" accept=".jwlibrary" onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            toast.promise(mergeBackup(file), { loading: "Mesclando...", success: "Mesclado com sucesso!", error: "Erro ao mesclar" })
                            e.currentTarget.value = ""
                          }} disabled={isMerging} />
                        {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Merge className="mr-2 h-4 w-4"/>}
                        Mesclar Outro Backup
                      </label>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                      const blob = await generateUpdatedBlob();
                      if(blob) saveAs(blob, `${activeBackup.name}_editado.jwlibrary`);
                  }}>
                    <Download className="mr-2 h-4 w-4"/> Baixar .jwlibrary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Dialog Saída */}
          <Dialog open={isUnsavedChangesDialogOpen} onOpenChange={setIsUnsavedChangesDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterações não salvas</DialogTitle>
                <DialogDescription>
                  Existem alterações pendentes. O salvamento automático ocorre a cada 5s de inatividade. Deseja sair sem salvar?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsUnsavedChangesDialogOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={confirmExit}>Sair sem salvar</Button>
                <Button onClick={async () => { await handleCloudSave(); confirmExit(); }}>Salvar e Sair</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Barra de Busca Expansível */}
          <AnimatePresence>
            {(showSearchMobile || searchTerm) && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }} 
                 animate={{ height: "auto", opacity: 1 }} 
                 exit={{ height: 0, opacity: 0 }}
                 className="border-b bg-muted/10 overflow-hidden"
               >
                 <div className="px-4 py-3 relative max-w-3xl mx-auto">
                   <Search className="absolute left-7 top-5 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Filtrar por título, conteúdo ou tag..." 
                     className="pl-9 h-10 bg-background border-muted-foreground/20" 
                     value={searchTerm} 
                     onChange={e => setSearchTerm(e.target.value)}
                     autoFocus
                   />
                   {searchTerm && (
                     <button onClick={() => setSearchTerm("")} className="absolute right-7 top-5 text-muted-foreground hover:text-foreground">
                       <X className="h-4 w-4" />
                     </button>
                   )}
                 </div>
               </motion.div>
            )}
          </AnimatePresence>

          {/* Filtros de Cor e Tag (Scrollable) */}
          <div className="px-4 py-2 border-b bg-background/50 backdrop-blur-sm">
             <div className="max-w-[1920px] mx-auto space-y-2">
                {/* Cores */}
                <div className="overflow-x-auto no-scrollbar pb-1">
                   <div className="flex gap-2 min-w-max px-1">
                      <button onClick={() => setColorFilter("all")} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:bg-muted", colorFilter === "all" ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-background text-muted-foreground border-border")}>
                        <Filter className="w-3 h-3" /> Todos
                      </button>
                      <div className="w-px h-5 bg-border mx-1 self-center" />
                      {JW_COLORS.map(c => (
                         <button key={c.id} onClick={() => setColorFilter(c.id.toString())} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all hover:brightness-95", colorFilter === c.id.toString() ? `ring-2 ring-offset-2 ring-${c.border.split('-')[1]}-400 font-semibold shadow-sm` : "opacity-80 hover:opacity-100", c.bg, c.border, c.text)}>
                            <div className={cn("w-2 h-2 rounded-full", c.dot)} />
                            {c.name}
                         </button>
                      ))}
                   </div>
                </div>
                
                {/* Tags */}
                {allTags.length > 0 && (
                   <div className="overflow-x-auto no-scrollbar pt-1">
                      <div className="flex gap-2 min-w-max items-center px-1">
                        <TagIcon className="w-3.5 h-3.5 text-muted-foreground/70 mr-1" />
                        {allTags.map((t) => {
                           const active = tagFilter.includes(t.Name);
                           return (
                             <button key={t.TagId} onClick={() => setTagFilter(prev => prev.includes(t.Name) ? prev.filter(n => n !== t.Name) : [...prev, t.Name])} className={cn("px-2.5 py-1 rounded-md text-xs border transition-colors", active ? "bg-secondary text-secondary-foreground border-secondary-foreground/20 font-medium" : "bg-background text-muted-foreground border-border hover:border-primary/30")}>
                               #{t.Name}
                             </button>
                           );
                        })}
                        {tagFilter.length > 0 && (
                           <button onClick={() => setTagFilter([])} className="px-2 py-1 text-xs text-muted-foreground hover:text-red-500 transition-colors ml-2 underline underline-offset-2">Limpar</button>
                        )}
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* --- Área Principal (Grid/List) --- */}
        <div className="flex-1 overflow-y-auto bg-muted/5 p-4 sm:p-6 no-scrollbar">
          <div className={cn(
            "max-w-[1920px] mx-auto pb-20",
            viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" : "flex flex-col gap-2 max-w-4xl mx-auto"
          )}>
            <AnimatePresence mode="popLayout">
            {filteredNotes.length > 0 ? filteredNotes.map((note) => {
              const colorObj = JW_COLORS.find(c => c.id === note.ColorIndex) || JW_COLORS[0];
              
              if (viewMode === 'list') {
                return (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={note.NoteId}>
                    <div 
                      onClick={() => handleEditNote(note)}
                      className="group relative flex items-center bg-card hover:bg-accent/5 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm"
                    >
                       <div className={cn("w-1.5 self-stretch rounded-full mr-4", colorObj.dot)} />
                       <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate text-foreground">{note.Title || <span className="text-muted-foreground italic">Sem título</span>}</h3>
                          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{note.Content ? note.Content.replace(/\n/g, ' ') : "..."}</p>
                       </div>
                       <div className="flex items-center gap-3 ml-4">
                          {note.Tags.length > 0 && (
                            <div className="hidden sm:flex gap-1">
                               {note.Tags.slice(0, 2).map((tag, i) => <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5">#{tag}</Badge>)}
                               {note.Tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{note.Tags.length - 2}</span>}
                            </div>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="h-4 w-4"/></Button>
                       </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={note.NoteId}>
                  <Card 
                    className={cn(
                      "py-0! group h-full flex flex-col overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card",
                      colorObj.bg.replace("50", "50/30") // Mais sutil
                    )}
                    onClick={() => handleEditNote(note)}
                  >
                    {/* Faixa Colorida Superior */}
                    <div className={cn("h-2 w-full", colorObj.dot)} />
                    
                    <div className="p-4 flex flex-col h-full gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-card-foreground" title={note.Title || ""}>
                          {note.Title || <span className="text-muted-foreground italic">Sem título</span>}
                        </h3>
                      </div>
                      
                      <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap flex-1 font-normal leading-relaxed">
                        {note.Content || <span className="italic opacity-50">Conteúdo vazio...</span>}
                      </div>

                      <div className="pt-3 mt-auto flex items-center justify-between border-t border-black/5 dark:border-white/5">
                         <div className="flex flex-wrap gap-1">
                           {note.Tags.slice(0, 3).map((tag, i) => (
                             <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/60 text-foreground/80 border shadow-sm">#{tag}</span>
                           ))}
                           {note.Tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{note.Tags.length - 3}</span>}
                         </div>
                         <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            }) : (
              <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                 <div className="p-6 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/20">
                    <Search className="w-8 h-8 opacity-40"/>
                 </div>
                 <div className="text-center">
                    <p className="text-base font-medium text-foreground">Nenhuma nota encontrada</p>
                    <p className="text-sm">Tente ajustar seus filtros ou criar uma nova nota.</p>
                 </div>
                 <Button variant="outline" onClick={() => {setSearchTerm(""); setColorFilter("all"); setTagFilter([])}}>Limpar todos os filtros</Button>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* ======================================================= */}
        {/* SHEET: EDITAR/CRIAR NOTA                                */}
        {/* ======================================================= */}
        <Sheet open={isNoteSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent side="right" className="w-[100vw] sm:w-[600px] p-0 flex flex-col gap-0 border-l shadow-2xl z-50">
            
            {/* Header Sheet */}
            <div className="px-6 py-4 border-b bg-background flex flex-row items-center justify-between z-10">
              <div className="flex flex-col gap-0.5">
                <SheetTitle className="text-lg">{editingNote ? "Editar Nota" : "Criar Nota"}</SheetTitle>
                <div className="flex items-center gap-2">
                   <div className={cn("w-2 h-2 rounded-full", noteSaveStatus === 'saved' ? "bg-green-500" : noteSaveStatus === 'saving' ? "bg-blue-500 animate-pulse" : "bg-orange-500")}/>
                   <span className="text-xs text-muted-foreground font-normal">
                     {noteSaveStatus === 'saving' ? "Salvando..." : noteSaveStatus === 'unsaved' ? "Alterações pendentes" : "Salvo"}
                   </span>
                </div>
              </div>
              <div className="flex gap-1">
                 {editingNote && (
                   <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteNote(editingNote.NoteId)}>
                      <Trash2 className="h-5 w-5" />
                   </Button>
                 )}
                 <Button variant="ghost" size="icon" onClick={() => handleCloseSheet()}><X className="h-5 w-5"/></Button>
              </div>
            </div>
             
            <div className="flex-1 overflow-y-auto bg-background no-scrollbar">
              <div className="p-6 space-y-8 max-w-2xl mx-auto">
                 
                 {/* Inputs Principais */}
                 <div className="space-y-6">
                    <div className="flex gap-4">
                       <div className="flex-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Título</Label>
                          <Input 
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            placeholder="Sem título"
                            className="rounded-lg! px-2! text-xl font-semibold border-1 rounded-none h-auto py-2 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/30 bg-transparent transition-colors"
                          />
                       </div>
                       
                       <div>
                          <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Cor</Label>
                          <Select value={editColor} onValueChange={setEditColor}>
                            <SelectTrigger className="w-[120px] border-muted-foreground/20">
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-3 h-3 rounded-full", JW_COLORS.find(c => c.id.toString() === editColor)?.dot || "bg-zinc-400")} />
                                  <span className="truncate">{JW_COLORS.find(c => c.id.toString() === editColor)?.name}</span>
                               </div>
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
                    </div>

                    {/* Tags Area */}
                    <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-muted-foreground/10">
                       <div className="flex justify-between items-center">
                          <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Etiquetas</Label>
                          <span className="text-[10px] text-muted-foreground">{selectedTags.length} selecionada(s)</span>
                       </div>

                       <div className="flex flex-wrap gap-2">
                          {selectedTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-background border shadow-sm hover:bg-muted">
                              {tag}
                              <button onClick={() => toggleTagSelection(tag)} className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          
                          <Popover open={isTagComboboxOpen} onOpenChange={setIsTagComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent hover:bg-background hover:text-primary">
                                <Plus className="h-3 w-3 mr-1"/> Adicionar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar tag..." />
                                <CommandList>
                                  <CommandEmpty className="p-2 text-sm text-center text-muted-foreground">
                                     <p>Tag não encontrada.</p>
                                     <p className="text-xs mt-1">Digite no campo abaixo para criar.</p>
                                  </CommandEmpty>
                                  <CommandGroup heading="Disponíveis">
                                    {allTags.map((tag) => (
                                      <CommandItem key={tag.TagId} value={tag.Name} onSelect={() => {
                                           if(!selectedTags.includes(tag.Name)) setSelectedTags([...selectedTags, tag.Name]);
                                           setIsTagComboboxOpen(false);
                                      }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedTags.includes(tag.Name) ? "opacity-100" : "opacity-0")} />
                                        {tag.Name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                       </div>
                       
                       {/* Input Manual de Tag */}
                       <div className="relative">
                          <TagIcon className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                          <Input 
                            placeholder="Criar nova tag (digite e enter)..." 
                            className="h-8 pl-8 text-xs bg-background border-muted-foreground/20"
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

                    {/* Conteúdo Textarea */}
                    <div className="pt-2 bg-muted/30 p-4 rounded-xl space-y-3 border border-muted-foreground/10">
                       <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Conteúdo</Label>
                       <Textarea 
                         value={editContent} 
                         onChange={e => setEditContent(e.target.value)} 
                         placeholder="Escreva sua nota aqui..." 
                         className="min-h-[400px] resize-none border-none shadow-none p-0 focus-visible:ring-0 text-base leading-relaxed bg-transparent! placeholder:text-muted-foreground/40"
                       />
                    </div>
                 </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Modal Gerenciar Tags */}
        <Dialog open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Tags Globais</DialogTitle>
              <DialogDescription>Gerencie as tags presentes neste backup.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] -mx-6 px-6">
              <div className="space-y-1 py-2">
                {allTags.map(tag => (
                  <div key={tag.TagId} className="flex items-center justify-between group py-2 border-b last:border-0 border-dashed border-muted">
                    {editingTagId === tag.TagId ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in">
                        <Input value={editingTagName} onChange={e => setEditingTagName(e.target.value)} className="h-8 text-sm" autoFocus />
                        <Button size="icon" className="h-8 w-8 text-green-600 shrink-0" variant="ghost" onClick={() => handleUpdateTag(tag.TagId)}><Save className="h-4 w-4"/></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-normal text-muted-foreground">#{tag.Name}</Badge>
                        </div>
                        <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingTagId(tag.TagId); setEditingTagName(tag.Name); }}><Edit className="h-3.5 w-3.5"/></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteTag(tag.TagId)}><Trash2 className="h-3.5 w-3.5"/></Button>
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
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Meus Backups</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
              Gerencie seus arquivos <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">.jwlibrary</code>. 
              Edite notas, organize tags e mescle arquivos na nuvem.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button onClick={handleCreateNew} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Criar Novo
            </Button>
            <label className="cursor-pointer">
              <div className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2">
                <Download className="h-4 w-4" /> Importar Arquivo
              </div>
              <input type="file" className="hidden" accept=".jwlibrary" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* Lista de Cards */}
        {loadingList ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1,2,3].map(i => (
                <div key={i} className="h-48 rounded-xl border bg-card p-6 flex flex-col justify-between animate-pulse">
                   <div className="flex justify-between">
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                      <div className="w-8 h-8 rounded bg-muted" />
                   </div>
                   <div className="space-y-2">
                      <div className="w-3/4 h-6 bg-muted rounded" />
                      <div className="w-1/2 h-4 bg-muted rounded" />
                   </div>
                </div>
             ))}
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
                    className="group relative cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-dashed hover:border-solid bg-card/40 hover:bg-card overflow-hidden"
                    onClick={() => openEditor(bkp)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardContent className="p-6 flex flex-col h-full gap-6">
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
                          <Cloud className="h-6 w-6" />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-2 -mt-2"
                          onClick={(e) => { e.stopPropagation(); deleteBackup(bkp.id, bkp.storagePath); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg leading-tight truncate pr-2 group-hover:text-primary transition-colors">{bkp.name}</h3>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                           <Edit className="w-3 h-3" />
                           Editado em {new Date(bkp.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                        Abrir Editor <ArrowLeft className="h-3 w-3 ml-2 rotate-180"/>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {backups.length === 0 && (
               <div className="col-span-full border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/5">
                 <div className="bg-muted p-4 rounded-full mb-4"><Cloud className="h-8 w-8 opacity-50"/></div>
                 <h3 className="font-semibold text-lg text-foreground">Sua nuvem está vazia</h3>
                 <p className="text-sm max-w-xs mt-2">Importe um arquivo .jwlibrary ou crie um novo para começar.</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
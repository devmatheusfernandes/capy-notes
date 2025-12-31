"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateNote,
  useNotes,
  useCurrentUserId,
  useFolders,
  useTags,
} from "@/hooks/notes";
import { getSubfolders, updateFolder } from "@/lib/folders";
import { updateNote } from "@/lib/notes";
import {
  Folder,
  FileText,
  Archive,
  Trash2,
  MoreVertical,
  Pin,
  X,
  Move,
  Download,
  Tag,
  CheckCircle2,
  ArchiveRestore,
  PinOff,
  FolderOpen,
  Lock,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { createNotesPageActions } from "@/lib/notes-page-actions";
import TagEditorDialog from "@/components/notes/tag-editor-dialog";
import MobileActionsSheet from "@/components/notes/mobile-actions-sheet";
 
import { cn, toggleNoteChecklistItem } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/notes/confirm-dialog";
import { NoteCard } from "@/components/notes/note-card";
import FolderItem from "@/components/notes/folder-item";
import { BackgroundContextMenu } from "@/components/notes/background-context-menu";
import { NoteTagSelector } from "@/components/notes/note-tag-selector";
import { BatchTagEditorDialog } from "@/components/notes/batch-tag-editor-dialog";
import { PinDialog } from "@/components/notes/pin-dialog";
import { hasUserPin } from "@/lib/user-settings";
import { toast } from "sonner";
import { NoteData, FolderData } from "@/types";
import { ExportToJwlDialog } from "@/components/notes/export-to-jwl-dialog";

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}>
      <NotesContent />
    </Suspense>
  );
}

function NotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create } = useCreateNote();
  const userId = useCurrentUserId();

  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(
    undefined
  );

  const { folders } = useFolders();
  const { tags } = useTags();
  const { notes } = useNotes({ folderId: currentFolderId, archived, search });
  const { notes: allNotes } = useNotes();

  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [editingTagsNoteId, setEditingTagsNoteId] = useState<string | null>(null);
  const [isBatchTagEditorOpen, setIsBatchTagEditorOpen] = useState(false);
  const [isExportJwlOpen, setIsExportJwlOpen] = useState(false);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description?: string;
    action: () => void;
  } | null>(null);

  const [pinDialogState, setPinDialogState] = useState<{
    open: boolean;
    mode: "open" | "toggle-lock";
    itemId: string | null;
    itemType: "note" | "folder";
  }>({ open: false, mode: "open", itemId: null, itemType: "note" });

  const [unlockedFolderIds, setUnlockedFolderIds] = useState<string[]>([]);

  const handleNoteClick = (note: NoteData) => {
    if (note.isLocked) {
      setPinDialogState({ open: true, mode: "open", itemId: note.id, itemType: "note" });
    } else {
      router.push(`/hub/notes/${note.id}`);
    }
  }

  const handleFolderClick = (folder: FolderData) => {
    if (folder.isLocked) {
      setPinDialogState({ open: true, mode: "open", itemId: folder.id, itemType: "folder" });
    } else {
      handleNavigateFolder(folder.id);
    }
  }

  const handleToggleLock = async (note: NoteData) => {
    if (!userId) return;
    
    if (!note.isLocked) {
      const hasPin = await hasUserPin(userId);
      if (!hasPin) {
        toast.error("Defina um PIN nas configurações para trancar notas");
        router.push("/hub/settings?tab=seguranca");
        return;
      }
      await updateNote(userId, note.id, { isLocked: true });
      toast.success("Nota trancada");
    } else {
      setPinDialogState({ 
        open: true, 
        mode: "toggle-lock", 
        itemId: note.id,
        itemType: "note"
      });
    }
  }

  const handleToggleFolderLock = async (folder: FolderData) => {
    if (!userId) return;
    
    if (!folder.isLocked) {
      const hasPin = await hasUserPin(userId);
      if (!hasPin) {
        toast.error("Defina um PIN nas configurações para trancar pastas");
        router.push("/hub/settings?tab=seguranca");
        return;
      }
      await updateFolder(userId, folder.id, { isLocked: true });
      toast.success("Pasta trancada");
    } else {
      setPinDialogState({ 
        open: true, 
        mode: "toggle-lock", 
        itemId: folder.id,
        itemType: "folder"
      });
    }
  }

  const onPinSuccess = async () => {
    if (!pinDialogState.itemId || !userId) return;

    if (pinDialogState.mode === "open") {
      if (pinDialogState.itemType === "note") {
        router.push(`/hub/notes/${pinDialogState.itemId}`);
      } else {
        setUnlockedFolderIds(prev => [...prev, pinDialogState.itemId!]);
        handleNavigateFolder(pinDialogState.itemId);
      }
    } else if (pinDialogState.mode === "toggle-lock") {
      if (pinDialogState.itemType === "note") {
        await updateNote(userId, pinDialogState.itemId, { isLocked: false });
        toast.success("Nota destrancada");
      } else {
        await updateFolder(userId, pinDialogState.itemId, { isLocked: false });
        toast.success("Pasta destrancada");
      }
    }
  }

  // Ordenação
  const filteredNotes = useMemo(() => {
    if (!selectedTagId) return notes;
    return notes.filter((n) => (n.tagIds || []).includes(selectedTagId));
  }, [notes, selectedTagId]);

  const orderedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      const p = Number(!!b.pinned) - Number(!!a.pinned);
      if (p !== 0) return p;
      const bu = new Date(b.updatedAt || b.createdAt).getTime();
      const au = new Date(a.updatedAt || a.createdAt).getTime();
      return bu - au;
    });
  }, [filteredNotes]);

  const visibleFolders = useMemo(() => {
    let result = folders;
    result = result.filter((f) => (archived ? !!f.archived : !f.archived));
    result = result.filter((f) => !f.trashed);
    result = result.filter(
      (f) =>
        f.parentId ===
        (currentFolderId === undefined ? undefined : currentFolderId)
    );
    return result;
  }, [folders, archived, currentFolderId]);

  const hasSelection = selectedNotes.length + selectedFolders.length > 0;

  const isCurrentFolderLocked = useMemo(() => {
    if (!currentFolderId) return false;
    const f = folders.find(x => x.id === currentFolderId);
    return !!(f?.isLocked && !unlockedFolderIds.includes(f.id));
  }, [folders, currentFolderId, unlockedFolderIds]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("notes_view");
      if (stored === "grid" || stored === "list") {
        setView(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const fid = searchParams.get("folder") || undefined;
    setCurrentFolderId(fid);
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const v = ce.detail as "list" | "grid";
      if (v === "list" || v === "grid") setView(v);
    };
    window.addEventListener("capynotes_view_changed", handler as EventListener);
    return () =>
      window.removeEventListener("capynotes_view_changed", handler as EventListener);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("notes_view", view);
    } catch {}
  }, [view]);

  // Handler para marcar item do checklist sem abrir a nota
  const handleCheckItem = async (noteId: string, itemIndex: number) => {
    if (!userId) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const newContent = toggleNoteChecklistItem(note, itemIndex);
    try {
      await updateNote(userId, noteId, { content: newContent });
    } catch (error) {
      console.error("Failed to update checklist", error);
    }
  };

  const handleRename = async (noteId: string, newTitle: string) => {
    if (!userId) return;
    await updateNote(userId, noteId, { title: newTitle });
  };

  const clearSelection = () => {
    setSelectedNotes([]);
    setSelectedFolders([]);
  };

  const selectAllVisible = () => {
    setSelectedNotes(notes.map((n) => n.id));
    setSelectedFolders(visibleFolders.map((f) => f.id));
  };

  const handleCreateNote = async () => {
    const note = await create({ folderId: currentFolderId });
    router.push(`/hub/notes/${note.id}`);
  };

  const actions = createNotesPageActions({
    userId: userId ?? undefined,
    currentFolderId,
    create,
    router,
    tags,
    folders,
    notes,
    allNotes,
    setSelectedNotes,
    setSelectedFolders,
    getSelectedNotes: () => selectedNotes,
    getSelectedFolders: () => selectedFolders,
    clearSelection,
    setCurrentFolderId,
  });

  const {
    handleCreateFolder,
    handleNavigateFolder,
    handleAddTag,
    handleUpdateTag,
    handleDeleteTag,
    toggleNoteSelected,
    toggleFolderSelected,
    handleDeleteNote,
    handleArchiveNote,
    handleMoveNote,
    handleMoveFolder,
    handleArchiveFolder,
    handleExportNote,
    bulkDelete,
    bulkArchive,
    bulkPin,
    bulkMove,
    bulkExport,
    handleDeleteFolder,
    handleTogglePin,
  } = actions;

  const bulkExportJwl = () => {
    if (selectedNotes.length === 0) return;
    setIsExportJwlOpen(true);
  };

  const moveFolders = useMemo(() => folders.filter((f) => !f.archived && !f.trashed), [folders])

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, type: "note" | "folder", id: string) => {
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("id", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to background
    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");

    if (!type || !id) return;
    if (id === targetFolderId) return;

    if (type === "note") {
      handleMoveNote(id, targetFolderId);
    } else if (type === "folder") {
      handleMoveFolder(id, targetFolderId);
    }
  };

  // Menus Reutilizáveis
  const getMoveSubmenu = (onMove: (targetId: string | undefined) => void) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Move className="mr-2 h-4 w-4" /> Mover para
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
        <DropdownMenuItem onSelect={() => onMove(undefined)}>
          Início
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {getSubfolders(moveFolders, undefined).map((root) => (
          <DropdownMenuSub key={root.id}>
            <DropdownMenuSubTrigger>{root.name}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => onMove(root.id)}>
                Mover aqui
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {getSubfolders(moveFolders, root.id).map((sub) => (
                <DropdownMenuItem key={sub.id} onSelect={() => onMove(sub.id)}>
                  {sub.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  const getContextMenuMoveSubmenu = (
    onMove: (targetId: string | undefined) => void
  ) => (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Move className="mr-2 h-4 w-4" /> Mover para
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
        <ContextMenuItem onSelect={() => onMove(undefined)}>
          Início
        </ContextMenuItem>
        <ContextMenuSeparator />
        {getSubfolders(moveFolders, undefined).map((root) => (
          <ContextMenuSub key={root.id}>
            <ContextMenuSubTrigger>{root.name}</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => onMove(root.id)}>
                Mover aqui
              </ContextMenuItem>
              {getSubfolders(moveFolders, root.id).map((sub) => (
                <ContextMenuItem key={sub.id} onSelect={() => onMove(sub.id)}>
                  {sub.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );

  const lockedFolderUI = (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-muted rounded-full p-6 mb-4">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Pasta Protegida</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Esta pasta está trancada. Digite o PIN para visualizar seu conteúdo.
      </p>
      <Button onClick={() => setPinDialogState({ open: true, mode: "open", itemId: currentFolderId!, itemType: "folder" })}>
        Destrancar Pasta
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-4 pb-20 md:pb-0 relative p-4">
      {/* Mobile Header */}
      <div className="col-span-12 md:hidden space-y-3 sticky top-0 z-20 bg-background/95 backdrop-blur pb-2 border-b">
        <div className="flex items-center justify-between">
            <MobileActionsSheet
              archived={archived}
              setArchived={setArchived}
              view={view}
              setView={setView}
              tags={tags}
              allNotes={allNotes}
              onAddTag={handleAddTag}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
              search={search}
              setSearch={setSearch}
              onCreateNote={handleCreateNote}
              onCreateFolder={(n) => handleCreateFolder(n)}
              selectedTagId={selectedTagId}
              setSelectedTagId={setSelectedTagId}
            />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:col-span-3 lg:col-span-2 space-y-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto pr-2">
        <Input
          placeholder="Buscar notas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <nav className="space-y-1">
          <Button
            variant={!archived ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setArchived(false);
              router.push("/hub/notes");
            }}
          >
            <FileText className="mr-2 h-4 w-4" /> Notas
          </Button>
          <Button
            variant={archived ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setArchived(true)}
          >
            <Archive className="mr-2 h-4 w-4" /> Arquivadas
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => router.push("/hub/trash")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Lixeira
          </Button>
        </nav>
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Etiquetas
            </span>
            <TagEditorDialog
              tags={tags}
              allNotes={allNotes}
              onAdd={handleAddTag}
              onUpdate={handleUpdateTag}
              onDelete={handleDeleteTag}
            />
          </div>
          <div className="space-y-1">
            <Button
              variant={!selectedTagId ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTagId(undefined)}
            >
              Todas
            </Button>
            {tags.map((t) => (
              <Button
                key={t.id}
                variant={selectedTagId === t.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedTagId(t.id)}
              >
                <span
                  className="inline-block size-2 rounded-full ring-1 ring-white/20 mr-2"
                  style={{ backgroundColor: t.color || "#8884d8" }}
                />
                <span className="truncate">{t.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4 min-h-[80vh]">

        {/* Floating Bulk Actions */}
        <AnimatePresence>
          {hasSelection && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed inset-x-4 bottom-4 md:sticky md:top-4 md:bottom-auto z-50 flex justify-center"
            >
              <div className="bg-primary-foreground text-foreground dark:bg-zinc-800 rounded-xl shadow-2xl border px-4 py-2 flex items-center gap-2 md:gap-4 max-w-full overflow-x-auto">
                <div className="flex items-center gap-2 border-r border-white/20 pr-4 mr-2">
                  <span className="font-bold text-sm whitespace-nowrap">
                    {selectedNotes.length + selectedFolders.length}{" "}
                    selecionado(s)
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="h-6 w-6 hover:bg-white/20 text-current"
                  >
                    <X size={14} />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllVisible}
                    className="hidden sm:flex hover:bg-white/10 hover:text-current"
                  >
                    Todos
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-white/10 hover:text-current"
                      >
                        <Move size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onSelect={() => bulkMove(undefined)}>
                      Início
                    </DropdownMenuItem>
                    {getSubfolders(moveFolders, undefined).map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onSelect={() => bulkMove(f.id)}
                      >
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBatchTagEditorOpen(true)}
                    title="Editar etiquetas"
                    className="hover:bg-white/10 hover:text-current"
                    disabled={selectedNotes.length === 0}
                  >
                    <Tag size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={bulkArchive}
                    title="Arquivar"
                    className="hover:bg-white/10 hover:text-current"
                  >
                    <Archive size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={bulkPin}
                    title="Fixar"
                    className="hover:bg-white/10 hover:text-current"
                  >
                    <Pin size={18} />
                  </Button>

                  {/* Lógica de Lixeira para Bulk Actions */}
                  {selectedNotes.length > 0 && selectedFolders.length === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          title: "Mover para Lixeira",
                          description:
                            "Mover notas selecionadas para a lixeira?",
                          action: () => bulkDelete("keep"),
                        })
                      }
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                  {selectedFolders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          title: "Mover para Lixeira",
                          description:
                            "Pastas selecionadas (e seus conteúdos) serão movidas para a lixeira.",
                          action: () => bulkDelete("delete"),
                        })
                      }
                      className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-white/10 hover:text-current"
                      >
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={bulkExport}>
                        <Download className="mr-2 h-4 w-4" /> Exportar (JSON)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkExportJwl}>
                        <Download className="mr-2 h-4 w-4" /> Exportar (JWL)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID DE CONTEÚDO */}
        <BatchTagEditorDialog
        open={isBatchTagEditorOpen}
        onOpenChange={setIsBatchTagEditorOpen}
        selectedNoteIds={selectedNotes}
        allNotes={allNotes}
        tags={tags}
        onSuccess={() => {
          setSelectedNotes([]);
          setIsBatchTagEditorOpen(false);
        }}
      />
      <BackgroundContextMenu
        onNewNote={handleCreateNote}
        onNewFolder={() => handleCreateFolder()}
      >
        {isCurrentFolderLocked ? lockedFolderUI : (
          <>
        <AnimatePresence mode="popLayout">
          <div
            className={cn(
              view === "grid"
                ? "columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3"
                : "flex flex-col space-y-2"
            )}
          >
            {/* PASTAS */}
            {visibleFolders.map((f) => (
              <FolderItem
                key={f.id}
                id={f.id}
                title={f.name}
                icon={<Folder className="text-primary" />}
                selected={selectedFolders.includes(f.id)}
                view={view}
                onToggleSelect={toggleFolderSelected}
                onClick={() => handleFolderClick(f)}
                hasSelectionMode={hasSelection}
                isLocked={f.isLocked}
                draggable
                onDragStart={(e) => handleDragStart(e, "folder", f.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, f.id)}
                actionsMenu={
                  <>
                    <DropdownMenuItem onSelect={() => toggleFolderSelected(f.id)}>
                      {selectedFolders.includes(f.id) ? (
                        <>
                          <X className="mr-2 h-4 w-4" /> Desmarcar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Selecionar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => handleArchiveFolder(f.id, !!f.archived)}
                    >
                      {f.archived ? (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleNavigateFolder(f.id)}>
                      <FolderOpen className="mr-2 h-4 w-4" /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleToggleFolderLock(f)}>
                      {f.isLocked ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" /> Destrancar
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" /> Trancar
                        </>
                      )}
                    </DropdownMenuItem>
                    {getMoveSubmenu((target) => handleMoveFolder(f.id, target))}
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-destructive! hover:bg-destructive/20! hover:text-destructive!">
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirm({
                              open: true,
                              title: "Excluir pasta",
                              action: () => handleDeleteFolder(f.id, "keep"),
                            })
                          }
                        >
                          <Folder className="mr-2 h-4 w-4" /> Só a pasta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirm({
                              open: true,
                              title: "Excluir pasta e conteúdo",
                              action: () => handleDeleteFolder(f.id, "delete"),
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Pasta e conteúdo
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                }
                contextMenu={
                  <>
                    <ContextMenuItem onSelect={() => toggleFolderSelected(f.id)}>
                      {selectedFolders.includes(f.id) ? (
                        <>
                          <X className="mr-2 h-4 w-4" /> Desmarcar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Selecionar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => handleArchiveFolder(f.id, !!f.archived)}
                    >
                      {f.archived ? (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => handleNavigateFolder(f.id)}>
                      <FolderOpen className="mr-2 h-4 w-4" /> Abrir
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleToggleFolderLock(f)}>
                      {f.isLocked ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" /> Destrancar
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" /> Trancar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        <ContextMenuItem
                          onSelect={() => handleDeleteFolder(f.id, "keep")}
                        >
                          <Folder className="mr-2 h-4 w-4" /> Só a pasta
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => handleDeleteFolder(f.id, "delete")}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Pasta e conteúdo
                        </ContextMenuItem>
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  </>
                }
              />
            ))}

            {/* NOTAS */}
            {orderedNotes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                tags={tags}
                selected={selectedNotes.includes(n.id)}
                onToggleSelect={toggleNoteSelected}
                onClick={() => handleNoteClick(n)}
                onCheck={handleCheckItem}
                onRename={handleRename}
                hasSelectionMode={hasSelection}
                draggable
                onDragStart={(e) => handleDragStart(e, "note", n.id)}
                actionsMenu={
                  <>
                    <DropdownMenuItem onSelect={() => setEditingTagsNoteId(n.id)}>
                      <Tag className="mr-2 h-4 w-4" /> Etiquetas
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => toggleNoteSelected(n.id)}>
                      {selectedNotes.includes(n.id) ? (
                        <>
                          <X className="mr-2 h-4 w-4" /> Desmarcar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Selecionar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleArchiveNote(n.id, !!n.archived)}
                    >
                      {n.archived ? (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </>
                      )}
                    </DropdownMenuItem>
                    {getMoveSubmenu((target) => handleMoveNote(n.id, target))}
                    <DropdownMenuItem
                      onSelect={() => handleTogglePin(n.id, !!n.pinned)}
                    >
                      {n.pinned ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" /> Desafixar
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" /> Fixar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleToggleLock(n)}>
                      {n.isLocked ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" /> Destrancar
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" /> Trancar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportNote(n.id)}>
                      <Download className="mr-2 h-4 w-4" /> Exportar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive! hover:bg-destructive/20! hover:text-destructive!"
                      onSelect={() =>
                        setConfirm({
                          open: true,
                          title: "Excluir nota",
                          action: () => handleDeleteNote(n.id),
                        })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                    </DropdownMenuItem>
                  </>
                }
                contextMenu={
                  <>
                    <ContextMenuItem onSelect={() => setEditingTagsNoteId(n.id)}>
                      <Tag className="mr-2 h-4 w-4" /> Etiquetas
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => toggleNoteSelected(n.id)}>
                      {selectedNotes.includes(n.id) ? (
                        <>
                          <X className="mr-2 h-4 w-4" /> Desmarcar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Selecionar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => handleArchiveNote(n.id, !!n.archived)}
                    >
                      {n.archived ? (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />{" "}
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </>
                      )}
                    </ContextMenuItem>
                    {getContextMenuMoveSubmenu((target) =>
                      handleMoveNote(n.id, target)
                    )}
                    <ContextMenuItem
                      onSelect={() => handleTogglePin(n.id, !!n.pinned)}
                    >
                      {n.pinned ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" /> Desafixar
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" /> Fixar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleToggleLock(n)}>
                      {n.isLocked ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" /> Destrancar
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" /> Trancar
                        </>
                      )}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleExportNote(n.id)}>
                      <Download className="mr-2 h-4 w-4" /> Exportar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-red-600"
                      onSelect={() =>
                        setConfirm({
                          open: true,
                          title: "Excluir nota",
                          action: () => handleDeleteNote(n.id),
                        })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </ContextMenuItem>
                  </>
                }
              />
            ))}
          </div>
        </AnimatePresence>

        {notes.length === 0 && visibleFolders.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
            <div className="bg-muted rounded-full p-4 mb-3">
              <Folder className="h-8 w-8 opacity-50" />
            </div>
            <p>Esta pasta está vazia.</p>
            <Button variant="link" onClick={handleCreateNote}>
              Criar primeira nota
            </Button>
          </div>
        )}
          </>
        )}
        </BackgroundContextMenu>
      </main>

      {editingTagsNoteId && (
        <NoteTagSelector
          open={!!editingTagsNoteId}
          onOpenChange={(open) => !open && setEditingTagsNoteId(null)}
          noteId={editingTagsNoteId}
          initialTagIds={
            notes.find((n) => n.id === editingTagsNoteId)?.tagIds || []
          }
          allTags={tags}
        />
      )}

      {pinDialogState.open && (
        <PinDialog
          open={pinDialogState.open}
          onOpenChange={(open) =>
            setPinDialogState((prev) => ({ ...prev, open }))
          }
          title={
            pinDialogState.mode === "toggle-lock"
              ? `Destrancar ${pinDialogState.itemType === "folder" ? "Pasta" : "Nota"}`
              : `${pinDialogState.itemType === "folder" ? "Pasta" : "Nota"} Protegida`
          }
          description={
            pinDialogState.mode === "toggle-lock"
              ? `Digite seu PIN para destrancar esta ${pinDialogState.itemType === "folder" ? "pasta" : "nota"} permanentemente.`
              : `Digite seu PIN para acessar esta ${pinDialogState.itemType === "folder" ? "pasta" : "nota"}.`
          }
          onSuccess={onPinSuccess}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          description={confirm.description}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const act = confirm.action;
            setConfirm(null);
            act();
          }}
        />
      )}

      <ExportToJwlDialog
        open={isExportJwlOpen}
        onOpenChange={setIsExportJwlOpen}
        selectedNotes={allNotes.filter(n => selectedNotes.includes(n.id))}
        allTags={tags}
        onSuccess={clearSelection}
      />
    </div>
  );
}

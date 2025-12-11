"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateNote, useNotes, useCurrentUserId, useFolders, useTags } from "@/hooks/notes";
import { getFolderPath, getSubfolders } from "@/lib/folders";
import {
  LayoutGrid,
  List as ListIcon,
  Folder,
  FileText,
  Archive,
  Trash2,
  MoreVertical,
  Pin,
  X,
  Move,
  Download,
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
import FolderBreadcrumbs from "@/components/notes/folder-breadcrumbs";
import TagEditorDialog from "@/components/notes/tag-editor-dialog";
import MobileActionsSheet from "@/components/notes/mobile-actions-sheet";
import CreateFolderDialog from "@/components/notes/create-folder-dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import GenericItem from "@/components/notes/generic-item";
import { getPreviewText } from "@/lib/note-preview";
import ConfirmDialog from "@/components/notes/confirm-dialog";

// --- Main Page Component ---
export default function NotesPage() {
  const router = useRouter();
  const { create, loading } = useCreateNote();
  const userId = useCurrentUserId();

  const [view, setView] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(
    undefined
  );
  const { folders } = useFolders();
  const { tags } = useTags();
  const { notes } = useNotes({ folderId: currentFolderId, archived, search });
  const { notes: allNotes } = useNotes();
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  const orderedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const p = Number(!!b.pinned) - Number(!!a.pinned)
      if (p !== 0) return p
      const bu = new Date(b.updatedAt || b.createdAt).getTime()
      const au = new Date(a.updatedAt || a.createdAt).getTime()
      return bu - au
    })
  }, [notes])

  const visibleFolders = useMemo(() => {
    let result = folders
    result = result.filter((f) => (archived ? !!f.archived : !f.archived))
    result = result.filter((f) => !f.trashed)
    result = result.filter((f) => f.parentId === (currentFolderId === undefined ? undefined : currentFolderId))
    return result
  }, [folders, archived, currentFolderId])

  const hasSelection = selectedNotes.length + selectedFolders.length > 0;

  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description?: string; action: () => void } | null>(null)

  const clearSelection = () => {
    setSelectedNotes([]);
    setSelectedFolders([]);
  };

  const selectAllVisible = () => {
    setSelectedNotes(notes.map((n) => n.id));
    setSelectedFolders(visibleFolders.map((f) => f.id));
  };

  const folderPath = useMemo(
    () => getFolderPath(folders, currentFolderId || ""),
    [folders, currentFolderId]
  );

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
    handleCreateNote,
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

  // --- Reusable Menu Logic ---
  const getMoveSubmenu = (onMove: (targetId: string | undefined) => void) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Move className="mr-2 h-4 w-4" /> Mover para
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
        <DropdownMenuItem onClick={() => onMove(undefined)}>
          Início
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {getSubfolders(folders, undefined).map((root) => (
          <DropdownMenuSub key={root.id}>
            <DropdownMenuSubTrigger>{root.name}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onMove(root.id)}>
                Mover aqui
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {getSubfolders(folders, root.id).map((sub) => (
                <DropdownMenuItem key={sub.id} onClick={() => onMove(sub.id)}>
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
      <ContextMenuSubTrigger>Mover para</ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
        <ContextMenuItem onSelect={() => onMove(undefined)}>
          Início
        </ContextMenuItem>
        <ContextMenuSeparator />
        {getSubfolders(folders, undefined).map((root) => (
          <ContextMenuSub key={root.id}>
            <ContextMenuSubTrigger>{root.name}</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => onMove(root.id)}>
                Mover aqui
              </ContextMenuItem>
              {getSubfolders(folders, root.id).map((sub) => (
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

  return (
    <div className="grid grid-cols-12 gap-4 pb-20 md:pb-0 relative">
      {/* Mobile Header */}
      <div className="col-span-12 md:hidden space-y-3 sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b">
        <FolderBreadcrumbs
          path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
          onNavigate={handleNavigateFolder}
        />
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-1">
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
            />
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (Sticky) */}
      <aside className="hidden md:block md:col-span-3 lg:col-span-2 space-y-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto pr-2">
        <Button
          className="w-full"
          onClick={handleCreateNote}
          disabled={loading}
        >
          <FileText className="mr-2 h-4 w-4" /> Nova Nota
        </Button>
        <Input
          placeholder="Buscar notas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <nav className="space-y-1">
          <Button
            variant={!archived ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setArchived(false)}
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

        {/* Labels Section */}
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
            {tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-sm px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer transition-colors"
              >
                <span
                  className="inline-block size-2 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: t.color || "#8884d8" }}
                />
                <span className="truncate">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4 min-h-[80vh]">
        {/* Desktop Header & Controls */}
        <div className="hidden md:flex items-center justify-between bg-background z-10 py-1">
          <FolderBreadcrumbs
            path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
            onNavigate={handleNavigateFolder}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView(view === "list" ? "grid" : "list")}
            >
              {view === "list" ? (
                <LayoutGrid size={20} />
              ) : (
                <ListIcon size={20} />
              )}
            </Button>
            <CreateFolderDialog onCreate={(n) => handleCreateFolder(n)} />
          </div>
        </div>

        {/* Selection / Bulk Actions Bar (Sticky & Floating) */}
        {hasSelection && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed inset-x-4 bottom-4 md:sticky md:top-4 md:bottom-auto z-50 flex justify-center"
          >
            <div className="bg-foreground text-background dark:bg-zinc-800 dark:text-zinc-100 rounded-xl shadow-2xl border px-4 py-2 flex items-center gap-2 md:gap-4 max-w-full overflow-x-auto">
              <div className="flex items-center gap-2 border-r border-white/20 pr-4 mr-2">
                <span className="font-bold text-sm whitespace-nowrap">
                  {selectedNotes.length + selectedFolders.length} selecionado(s)
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
                    <DropdownMenuItem onClick={() => bulkMove(undefined)}>
                      Início
                    </DropdownMenuItem>
                    {getSubfolders(folders, undefined).map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => bulkMove(f.id)}
                      >
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

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

                {selectedNotes.length > 0 && selectedFolders.length === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirm({
                      open: true,
                      title: "Mover para Lixeira",
                      description: "As notas selecionadas serão movidas para a Lixeira.",
                      action: () => bulkDelete("keep"),
                    })}
                    className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
                {selectedFolders.length > 0 && selectedNotes.length === 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setConfirm({
                        open: true,
                        title: "Mover pastas para Lixeira",
                        description: "As pastas serão movidas para a Lixeira. O conteúdo será movido para Início.",
                        action: () => bulkDelete("keep"),
                      })}>
                        Excluir (manter conteúdo)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirm({
                          open: true,
                          title: "Mover pastas e conteúdo para Lixeira",
                          description: "As pastas e todo o conteúdo serão movidos para a Lixeira.",
                          action: () => bulkDelete("delete"),
                        })}
                        className="text-red-600"
                      >
                        Excluir tudo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {selectedFolders.length > 0 && selectedNotes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirm({
                      open: true,
                      title: "Mover seleção para Lixeira",
                      description: "Há pastas selecionadas. Pastas e conteúdo, além das notas selecionadas, serão movidos para a Lixeira.",
                      action: () => bulkDelete("delete"),
                    })}
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
                      <Download className="mr-2 h-4 w-4" /> Exportar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        )}

        {/* Content List/Grid */}
        <AnimatePresence mode="popLayout">
          <div
            className={cn(
              view === "grid"
                ? "columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
                : "flex flex-col space-y-2"
            )}
          >
            {/* Folders */}
            {visibleFolders.map((f) => (
              <GenericItem
                key={f.id}
                id={f.id}
                title={f.name}
                icon={
                  <Folder
                    className={
                      view === "grid"
                        ? "h-8 w-8 text-primary"
                        : "h-5 w-5 text-primary"
                    }
                  />
                }
                selected={selectedFolders.includes(f.id)}
                view={view}
                onToggleSelect={toggleFolderSelected}
                onClick={() => setCurrentFolderId(f.id)}
                hasSelectionMode={hasSelection}
                actionsMenu={
                  <>
                    <DropdownMenuItem
                      onClick={() => toggleFolderSelected(f.id)}
                    >
                      {selectedFolders.includes(f.id)
                        ? "Desmarcar"
                        : "Selecionar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                <DropdownMenuItem
                      onClick={() => handleArchiveFolder(f.id, !!f.archived)}
                    >
                      {f.archived ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCurrentFolderId(f.id)}
                    >
                      Abrir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-red-600">
                        Excluir
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => setConfirm({
                            open: true,
                            title: "Mover pasta para Lixeira",
                            description: "Deseja mover apenas a pasta para a Lixeira? O conteúdo vai para Início.",
                            action: () => handleDeleteFolder(f.id, "keep"),
                          })}
                        >
                          Só a pasta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirm({
                            open: true,
                            title: "Mover pasta e conteúdo para Lixeira",
                            description: "Deseja mover a pasta e todo o conteúdo para a Lixeira?",
                            action: () => handleDeleteFolder(f.id, "delete"),
                          })}
                        >
                          Pasta e conteúdo
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {getMoveSubmenu((target) => handleMoveFolder(f.id, target))}
                  </>
                }
                contextMenu={
                  <>
                    <ContextMenuItem
                      onSelect={() => toggleFolderSelected(f.id)}
                    >
                      Selecionar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => handleArchiveFolder(f.id, !!f.archived)}
                    >
                      {f.archived ? "Desarquivar" : "Arquivar"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => setCurrentFolderId(f.id)}
                    >
                      Abrir
                    </ContextMenuItem>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>Excluir</ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        <ContextMenuItem
                          onSelect={() => setConfirm({
                            open: true,
                            title: "Excluir pasta",
                            description: "Deseja excluir apenas a pasta (conteúdo vai para Início)?",
                            action: () => handleDeleteFolder(f.id, "keep"),
                          })}
                        >
                          Só a pasta
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => setConfirm({
                            open: true,
                            title: "Excluir pasta e conteúdo",
                            description: "Deseja excluir a pasta e todo o conteúdo? Esta ação não pode ser desfeita.",
                            action: () => handleDeleteFolder(f.id, "delete"),
                          })}
                        >
                          Pasta e conteúdo
                        </ContextMenuItem>
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    {getContextMenuMoveSubmenu((target) => handleMoveFolder(f.id, target))}
                  </>
                }
              />
            ))}

            {/* Notes */}
            {orderedNotes.map((n) => (
              <GenericItem
                key={n.id}
                id={n.id}
                title={n.title || "Sem título"}
                subtitle={getPreviewText(n, view === "grid" ? 300 : 120)}
                icon={null}
                pinned={!!n.pinned}
                selected={selectedNotes.includes(n.id)}
                view={view}
                onToggleSelect={toggleNoteSelected}
                onClick={() => router.push(`/hub/notes/${n.id}`)}
                hasSelectionMode={hasSelection}
                actionsMenu={
                  <>
                    <DropdownMenuItem onClick={() => toggleNoteSelected(n.id)}>
                      {selectedNotes.includes(n.id)
                        ? "Desmarcar"
                        : "Selecionar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveNote(n.id, !!n.archived)}
                    >
                      {n.archived ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                    {getMoveSubmenu((target) => handleMoveNote(n.id, target))}
                    <DropdownMenuItem onClick={() => handleTogglePin(n.id, !!n.pinned)}>
                      {n.pinned ? "Desafixar" : "Fixar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportNote(n.id)}>
                      Exportar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setConfirm({
                        open: true,
                        title: "Excluir nota",
                        description: "Tem certeza que deseja excluir esta nota?",
                        action: () => handleDeleteNote(n.id),
                      })}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </>
                }
                contextMenu={
                  <>
                    <ContextMenuItem onSelect={() => toggleNoteSelected(n.id)}>
                      Selecionar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => handleArchiveNote(n.id, !!n.archived)}
                    >
                      {n.archived ? "Desarquivar" : "Arquivar"}
                    </ContextMenuItem>
                    {getContextMenuMoveSubmenu((target) =>
                      handleMoveNote(n.id, target)
                    )}
                    <ContextMenuItem onSelect={() => handleTogglePin(n.id, !!n.pinned)}>
                      {n.pinned ? "Desafixar" : "Fixar"}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleExportNote(n.id)}>
                      Exportar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-red-600"
                      onSelect={() => setConfirm({
                        open: true,
                        title: "Excluir nota",
                        description: "Tem certeza que deseja excluir esta nota?",
                        action: () => handleDeleteNote(n.id),
                      })}
                    >
                      Excluir
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
      </main>
      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          description={confirm.description}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const act = confirm.action
            setConfirm(null)
            act()
          }}
        />
      )}
    </div>
  );
}


import { updateNote, deleteNote } from "@/lib/notes"
import { createTag as createTagRemote, updateTag as updateTagRemote, deleteTag as deleteTagRemote } from "@/lib/tags"
import { createFolder as createFolderRemote, deleteFolder as deleteFolderRemote, updateFolder as updateFolderRemote, getSubfolders } from "@/lib/folders"
import type { NoteData, TagData, FolderData } from "@/types"

type Router = { push: (path: string) => void }

export interface NotesPageActionsConfig {
  userId?: string
  currentFolderId?: string
  create: (args: { folderId?: string }) => Promise<NoteData>
  router: Router
  tags: TagData[]
  folders: FolderData[]
  notes: NoteData[]
  allNotes: NoteData[]
  setSelectedNotes: (updater: (prev: string[]) => string[]) => void
  setSelectedFolders: (updater: (prev: string[]) => string[]) => void
  getSelectedNotes: () => string[]
  getSelectedFolders: () => string[]
  clearSelection: () => void
  setCurrentFolderId: (id?: string) => void
}

const getSubtreeFolderIds = (all: FolderData[], folderId: string) => {
  const byParent = new Map<string | undefined, string[]>([[undefined, []]])
  all.forEach((f) => {
    const arr = byParent.get(f.parentId) || []
    arr.push(f.id)
    byParent.set(f.parentId, arr)
  })
  const result: string[] = []
  const stack = [folderId]
  while (stack.length) {
    const id = stack.pop()!
    result.push(id)
    const children = byParent.get(id) || []
    children.forEach((c) => stack.push(c))
  }
  return result
}

export function createNotesPageActions(cfg: NotesPageActionsConfig) {
  const handleCreateNote = async () => {
    const note = await cfg.create({ folderId: cfg.currentFolderId })
    cfg.router.push(`/hub/notes/${note.id}`)
  }

  const handleCreateFolder = async (nameInput?: string) => {
    const name = (nameInput ?? window.prompt("Nome da pasta"))?.trim()
    if (!name) return
    if (!cfg.userId) return
    await createFolderRemote(cfg.userId, name, cfg.currentFolderId)
  }

  const handleNavigateFolder = (folderId?: string) => {
    cfg.setCurrentFolderId(folderId)
  }

  const handleAddTag = async (name: string, color?: string) => {
    if (!cfg.userId) return
    await createTagRemote(cfg.userId, name.trim(), color)
  }

  const handleUpdateTag = async (id: string, updates: Partial<TagData>) => {
    if (!cfg.userId) return
    await updateTagRemote(cfg.userId, id, updates)
  }

  const handleDeleteTag = async (id: string) => {
    if (!cfg.userId) return
    await deleteTagRemote(cfg.userId, id)
  }

  const toggleNoteSelected = (id: string) => {
    cfg.setSelectedNotes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleFolderSelected = (id: string) => {
    cfg.setSelectedFolders((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleDeleteNote = async (id: string) => {
    if (!cfg.userId) return
    await updateNote(cfg.userId, id, { trashed: true })
  }

  const handleArchiveNote = async (id: string, currentArchived: boolean) => {
    if (!cfg.userId) return
    await updateNote(cfg.userId, id, { archived: !currentArchived })
  }

  const handleMoveNote = async (id: string, targetFolderId?: string) => {
    if (!cfg.userId) return
    await updateNote(cfg.userId, id, { folderId: targetFolderId })
  }

  const handleMoveFolder = async (folderId: string, targetFolderId?: string) => {
    if (!cfg.userId) return
    await updateFolderRemote(cfg.userId, folderId, { parentId: targetFolderId })
  }

  const handleArchiveFolder = async (folderId: string, currentArchived: boolean) => {
    if (!cfg.userId) return
    await updateFolderRemote(cfg.userId, folderId, { archived: !currentArchived })
  }

  const handleExportNote = (id: string) => {
    const note = cfg.allNotes.find((n) => n.id === id)
    if (!note) return
    const blob = new Blob([JSON.stringify(note, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${note.title || "nota"}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const bulkDelete = async (folderMode: "keep" | "delete" = "keep") => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    const selectedFolders = cfg.getSelectedFolders()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { trashed: true })))
    for (const fid of selectedFolders) {
      await handleDeleteFolder(fid, folderMode)
    }
    cfg.clearSelection()
  }

  const bulkArchive = async () => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    const selectedFolders = cfg.getSelectedFolders()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { archived: true })))
    await Promise.all(selectedFolders.map((fid) => updateFolderRemote(cfg.userId!, fid, { archived: true })))
    cfg.clearSelection()
  }

  const bulkUnarchive = async () => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    const selectedFolders = cfg.getSelectedFolders()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { archived: false })))
    await Promise.all(selectedFolders.map((fid) => updateFolderRemote(cfg.userId!, fid, { archived: false })))
    cfg.clearSelection()
  }

  const bulkPin = async () => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { pinned: true })))
    cfg.clearSelection()
  }

  const bulkUnpin = async () => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { pinned: false })))
    cfg.clearSelection()
  }

  const bulkMove = async (targetFolderId?: string) => {
    if (!cfg.userId) return
    const selectedNotes = cfg.getSelectedNotes()
    await Promise.all(selectedNotes.map((id) => updateNote(cfg.userId!, id, { folderId: targetFolderId })))
    cfg.clearSelection()
  }

  const bulkExport = () => {
    const selectedNotes = cfg.getSelectedNotes()
    const toExport = cfg.allNotes.filter((n) => selectedNotes.includes(n.id))
    if (toExport.length === 0) return
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `notas-exportadas.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDeleteFolder = async (folderId: string, mode: "keep" | "delete") => {
    const subtree = getSubtreeFolderIds(cfg.folders, folderId)
    if (cfg.userId) {
      const targets = cfg.allNotes.filter((n) => subtree.includes(n.folderId || ""))
      if (mode === "keep") {
        await Promise.all(targets.map((n) => updateNote(cfg.userId!, n.id, { folderId: undefined })))
      } else {
        await Promise.all(targets.map((n) => updateNote(cfg.userId!, n.id, { trashed: true })))
      }
    }
    if (cfg.userId) await updateFolderRemote(cfg.userId, folderId, { trashed: true })
  }

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    if (!cfg.userId) return
    await updateNote(cfg.userId, id, { pinned: !currentPinned })
  }

  return {
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
    bulkUnarchive,
    bulkPin,
    bulkUnpin,
    bulkMove,
    bulkExport,
    handleDeleteFolder,
    handleTogglePin,
  }
}

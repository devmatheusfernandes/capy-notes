"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { folderStorage } from "@/lib/folder-storage"
import { useCreateNote, useNotes } from "@/hooks/notes"
import type { BreadcrumbItem, NoteData, TagData } from "@/types"
import { ChevronRight, Home, LayoutGrid, List, Folder, FileText, Archive, Edit, Menu, Plus, Pencil, Trash2 } from "lucide-react"

interface FolderBreadcrumbsProps {
  path: BreadcrumbItem[]
  onNavigate: (folderId?: string) => void
}

function FolderBreadcrumbs({ path, onNavigate }: FolderBreadcrumbsProps) {
  return (
    <div className="flex items-center space-x-1 text-sm text-muted-foreground overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
        onClick={() => onNavigate()}
      >
        <Home className="h-3 w-3 mr-1" />
        Início
      </Button>

      {path.map((item) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-3 w-3 mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
            onClick={() => onNavigate(item.id)}
          >
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  )
}

function getPreviewText(note: NoteData, max = 160): string {
  try {
    const c: any = note.content as any
    const blocks = c?.content || []
    for (const b of blocks) {
      const texts: string[] = []
      const collect = (node: any) => {
        if (!node) return
        if (typeof node.text === "string") texts.push(node.text)
        if (Array.isArray(node.content)) node.content.forEach(collect)
      }
      collect(b)
      const t = texts.join(" ").trim()
      if (t) return t.length > max ? t.slice(0, max) + "…" : t
    }
    return ""
  } catch {
    return ""
  }
}

const TAG_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#fbbf24",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
]

function TagEditor({
  tags,
  allNotes,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tags: TagData[]
  allNotes: NoteData[]
  onAdd: (name: string, color?: string) => void
  onUpdate: (id: string, updates: Partial<TagData>) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [colorInput, setColorInput] = useState<string | undefined>(TAG_COLORS[0])
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState<string>(TAG_COLORS[0])

  const startEdit = (t: TagData) => {
    setEditingId(t.id)
    setNameInput(t.name)
    setColorInput(t.color)
  }
  const saveEdit = () => {
    if (!editingId) return
    onUpdate(editingId, { name: nameInput.trim(), color: colorInput })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tags.map((t) => {
          const count = allNotes.filter((n) => (n.tagIds || []).includes(t.id)).length
          const isEditing = editingId === t.id
          return (
            <div key={t.id} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: (isEditing ? colorInput : t.color) || TAG_COLORS[0] }}
                  />
                  {isEditing ? (
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-7 w-48"
                    />
                  ) : (
                    <span className="font-medium">{t.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
                {isEditing && (
                  <div className="mt-2 flex items-center gap-2">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        className="size-5 rounded-full border"
                        style={{ backgroundColor: c, boxShadow: colorInput === c ? "0 0 0 2px var(--ring)" : undefined }}
                        onClick={() => setColorInput(c)}
                        aria-label="Pick color"
                      />
                    ))}
                    <Button variant="outline" size="sm" onClick={saveEdit}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(t)} aria-label="Edit">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(t.id)} aria-label="Delete" className="text-red-600">
                  <Trash2 />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Separator />
      <div className="space-y-2">
        <div className="text-sm font-medium">Add New Label</div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: newColor }} />
          <Input
            placeholder="New label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={() => {
              if (!newName.trim()) return
              onAdd(newName.trim(), newColor)
              setNewName("")
            }}
            aria-label="Add label"
          >
            <Plus />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              className="size-6 rounded-full border"
              style={{ backgroundColor: c, boxShadow: newColor === c ? "0 0 0 2px var(--ring)" : undefined }}
              onClick={() => setNewColor(c)}
              aria-label="Select color"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const router = useRouter()
  const { create, loading } = useCreateNote()

  const [view, setView] = useState<"list" | "grid">("list")
  const [search, setSearch] = useState("")
  const [archived, setArchived] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined)
  const [folders, setFolders] = useState(() => folderStorage.getSubfolders(undefined))
  const [tags, setTags] = useState<TagData[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tags") || "[]")
    } catch {
      return []
    }
  })

  useEffect(() => {
    const update = () => setFolders(folderStorage.getSubfolders(currentFolderId))
    update()
    const onUpdate = () => update()
    window.addEventListener("foldersUpdated", onUpdate)
    return () => window.removeEventListener("foldersUpdated", onUpdate)
  }, [currentFolderId])

  const { notes } = useNotes({ folderId: currentFolderId, archived, search })
  const { notes: allNotes } = useNotes()

  const folderPath = useMemo(() => folderStorage.getFolderPath(currentFolderId || ""), [currentFolderId])

  const handleCreateNote = async () => {
    const note = await create({ folderId: currentFolderId })
    router.push(`/hub/notes/${note.id}`)
  }

  const handleCreateFolder = async () => {
    const name = window.prompt("Nome da pasta")
    if (!name) return
    folderStorage.createFolder(name, currentFolderId)
  }

  const handleNavigateFolder = (folderId?: string) => {
    setCurrentFolderId(folderId)
  }

  const handleAddTag = (name: string, color?: string) => {
    const tag: TagData = {
      id: `tag_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      color,
      createdAt: new Date().toISOString(),
    }
    const next = [...tags, tag]
    setTags(next)
    localStorage.setItem("tags", JSON.stringify(next))
  }

  const handleUpdateTag = (id: string, updates: Partial<TagData>) => {
    const next = tags.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    setTags(next)
    localStorage.setItem("tags", JSON.stringify(next))
  }

  const handleDeleteTag = (id: string) => {
    const next = tags.filter((t) => t.id !== id)
    setTags(next)
    localStorage.setItem("tags", JSON.stringify(next))
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Mobile Header */}
      <div className="col-span-12 md:hidden space-y-3">
        {/* Breadcrumbs no topo */}
        <FolderBreadcrumbs
          path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
          onNavigate={handleNavigateFolder}
        />
        
        {/* Barra de ações */}
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-2">
                <Button
                  variant={archived ? "ghost" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setArchived(false)}
                >
                  <FileText className="mr-2" />
                  Notes
                </Button>
                <Button
                  variant={archived ? "outline" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setArchived(true)}
                >
                  <Archive className="mr-2" />
                  Archive
                </Button>
                
                <Separator className="my-3" />
                
                <div className="text-xs font-medium mb-2">Visualização</div>
                <Button
                  variant={view === "grid" ? "outline" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid className="mr-2" />
                  Grade
                </Button>
                <Button
                  variant={view === "list" ? "outline" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setView("list")}
                >
                  <List className="mr-2" />
                  Lista
                </Button>

                <Separator className="my-3" />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="mr-2" />
                      Edit Labels
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Labels</DialogTitle>
                    </DialogHeader>
                    <TagEditor
                      tags={tags}
                      allNotes={allNotes}
                      onAdd={handleAddTag}
                      onUpdate={handleUpdateTag}
                      onDelete={handleDeleteTag}
                    />
                  </DialogContent>
                </Dialog>

                <Separator className="my-3" />
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Labels</div>
                  <div className="space-y-1">
                    {tags.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: t.color || "#8884d8" }}
                        />
                        <span>{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Input
            placeholder="Search notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          
          <Button onClick={handleCreateNote} size="icon" aria-label="Add Note" disabled={loading}>
            <Plus />
          </Button>
          
          <Button onClick={handleCreateFolder} size="icon" variant="outline" aria-label="Create Folder">
            <Folder />
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:col-span-3 lg:col-span-2 space-y-3">
        <Button className="w-full" onClick={handleCreateNote} disabled={loading}>
          <FileText />
          Add Note
        </Button>
        <Input
          placeholder="Search notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-1">
          <Button
            variant={archived ? "ghost" : "outline"}
            className="w-full justify-start"
            onClick={() => setArchived(false)}
          >
            <FileText className="mr-2" />
            Notes
          </Button>
          <Button
            variant={archived ? "outline" : "ghost"}
            className="w-full justify-start"
            onClick={() => setArchived(true)}
          >
            <Archive className="mr-2" />
            Archive
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Edit className="mr-2" />
                Edit Labels
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Labels</DialogTitle>
              </DialogHeader>
              <TagEditor
                tags={tags}
                allNotes={allNotes}
                onAdd={handleAddTag}
                onUpdate={handleUpdateTag}
                onDelete={handleDeleteTag}
              />
            </DialogContent>
          </Dialog>

          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Labels</div>
            <div className="space-y-1">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: t.color || "#8884d8" }}
                  />
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <FolderBreadcrumbs
            path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
            onNavigate={handleNavigateFolder}
          />
          <div className="flex items-center gap-2">
            <Button variant={view === "grid" ? "outline" : "ghost"} size="icon" onClick={() => setView("grid")}>
              <LayoutGrid />
            </Button>
            <Button variant={view === "list" ? "outline" : "ghost"} size="icon" onClick={() => setView("list")}>
              <List />
            </Button>
            <Button variant="outline" onClick={handleCreateFolder}>
              <Folder />
              Create Folder
            </Button>
          </div>
        </div>

        {/* Content */}
        {view === "list" ? (
          <div className="space-y-4">
            {folders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className="rounded-lg border p-4 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 h-24"
                    onClick={() => setCurrentFolderId(f.id)}
                  >
                    <Folder className="shrink-0" />
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">Pasta</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {notes.map((n) => (
              <button
                key={n.id}
                className="rounded-lg border p-4 text-left hover:bg-accent hover:text-accent-foreground w-full"
                onClick={() => router.push(`/hub/notes/${n.id}`)}
              >
                <div className="text-lg font-semibold mb-1">{n.title}</div>
                <div className="text-sm text-muted-foreground">{getPreviewText(n)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {folders.map((f) => (
              <button
                key={f.id}
                className="rounded-lg border p-4 mb-4 break-inside-avoid inline-flex items-center gap-3 h-24 w-full text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => setCurrentFolderId(f.id)}
              >
                <Folder className="shrink-0" />
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">Pasta</div>
                </div>
              </button>
            ))}

            {notes.map((n) => (
              <button
                key={n.id}
                className="rounded-lg border p-4 mb-4 break-inside-avoid w-full text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => router.push(`/hub/notes/${n.id}`)}
              >
                <div className="text-lg font-semibold mb-1">{n.title}</div>
                <div className="text-sm text-muted-foreground">{getPreviewText(n, 220)}</div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

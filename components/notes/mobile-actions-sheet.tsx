"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import TagEditorDialog from "@/components/notes/tag-editor-dialog"
import CreateFolderDialog from "@/components/notes/create-folder-dialog"
import type { NoteData, TagData } from "@/types"
import { Archive, FileText, LayoutGrid, List, Menu, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function MobileActionsSheet({
  archived,
  setArchived,
  view,
  setView,
  tags,
  allNotes,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  search,
  setSearch,
  onCreateNote,
  onCreateFolder,
}: {
  archived: boolean
  setArchived: (v: boolean) => void
  view: "grid" | "list"
  setView: (v: "grid" | "list") => void
  tags: TagData[]
  allNotes: NoteData[]
  onAddTag: (name: string, color?: string) => void
  onUpdateTag: (id: string, updates: Partial<TagData>) => void
  onDeleteTag: (id: string) => void
  search: string
  setSearch: (v: string) => void
  onCreateNote: () => void
  onCreateFolder: (name: string) => void
}) {
  return (
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
            <Button variant={archived ? "ghost" : "outline"} className="w-full justify-start" onClick={() => setArchived(false)}>
              <FileText className="mr-2" />
              Notes
            </Button>
            <Button variant={archived ? "outline" : "ghost"} className="w-full justify-start" onClick={() => setArchived(true)}>
              <Archive className="mr-2" />
              Archive
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/hub/trash">
                <Trash2 className="mr-2" />
                Lixeira
              </Link>
            </Button>
            <Separator className="my-3" />
            <div className="text-xs font-medium mb-2">Visualização</div>
            <Button variant={view === "grid" ? "outline" : "ghost"} className="w-full justify-start" onClick={() => setView("grid")}>
              <LayoutGrid className="mr-2" />
              Grade
            </Button>
            <Button variant={view === "list" ? "outline" : "ghost"} className="w-full justify-start" onClick={() => setView("list")}>
              <List className="mr-2" />
              Lista
            </Button>
            <Separator className="my-3" />
            <TagEditorDialog
              tags={tags}
              allNotes={allNotes}
              onAdd={onAddTag}
              onUpdate={onUpdateTag}
              onDelete={onDeleteTag}
              triggerFullWidth
            />
            <Separator className="my-3" />
            <div>
              <div className="text-xs text-muted-foreground mb-2">Labels</div>
              <div className="space-y-1">
                {tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: t.color || "#8884d8" }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Input placeholder="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
      <Button onClick={onCreateNote} size="icon" aria-label="Add Note">
        <Plus />
      </Button>
      <CreateFolderDialog onCreate={onCreateFolder} iconOnly />
    </div>
  )
}

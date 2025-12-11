"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import TagEditor from "@/components/notes/tag-editor"
import type { NoteData, TagData } from "@/types"
import { Edit } from "lucide-react"

export default function TagEditorDialog({
  tags,
  allNotes,
  onAdd,
  onUpdate,
  onDelete,
  triggerFullWidth = false,
}: {
  tags: TagData[]
  allNotes: NoteData[]
  onAdd: (name: string, color?: string) => void
  onUpdate: (id: string, updates: Partial<TagData>) => void
  onDelete: (id: string) => void
  triggerFullWidth?: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className={triggerFullWidth ? "w-full justify-start" : "justify-start"}>
          <Edit />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Labels</DialogTitle>
        </DialogHeader>
        <TagEditor tags={tags} allNotes={allNotes} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      </DialogContent>
    </Dialog>
  )
}


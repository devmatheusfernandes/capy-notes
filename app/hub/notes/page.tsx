"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCreateNote } from "@/hooks/notes"
import { folderStorage } from "@/lib/folder-storage"

export default function NotesPage() {
  const router = useRouter()
  const { create, loading } = useCreateNote()

  const handleCreateNote = async () => {
    const note = await create()
    router.push(`/hub/notes/${note.id}`)
  }

  const handleCreateFolder = async () => {
    const name = window.prompt("Nome da pasta")
    if (!name) return
    folderStorage.createFolder(name)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={handleCreateNote} disabled={loading}>
          Criar nota
        </Button>
        <Button variant="outline" onClick={handleCreateFolder}>
          Criar pasta
        </Button>
      </div>
    </div>
  )
}

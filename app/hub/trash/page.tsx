"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useNotes, useFolders, useCurrentUserId } from "@/hooks/notes"
import { updateNote, deleteNote } from "@/lib/notes"
import { updateFolder, deleteFolder } from "@/lib/folders"
import { FileText, Folder, Trash2, Undo2 } from "lucide-react"

export default function TrashPage() {
  const router = useRouter()
  const userId = useCurrentUserId()
  const { notes } = useNotes({ trashed: true })
  const { folders } = useFolders()

  const trashedFolders = useMemo(() => folders.filter((f) => !!f.trashed), [folders])
  const [busy, setBusy] = useState(false)

  const restoreNote = async (id: string) => {
    if (!userId) return
    await updateNote(userId, id, { trashed: false })
  }

  const deleteNoteForever = async (id: string) => {
    if (!userId) return
    await deleteNote(userId, id)
  }

  const restoreFolder = async (id: string) => {
    if (!userId) return
    await updateFolder(userId, id, { trashed: false })
  }

  const deleteFolderForever = async (id: string) => {
    if (!userId) return
    const byParent = new Map<string | undefined, string[]>([[undefined, []]])
    folders.forEach((f) => {
      const arr = byParent.get(f.parentId) || []
      arr.push(f.id)
      byParent.set(f.parentId, arr)
    })
    const subtree: string[] = []
    const stack = [id]
    while (stack.length) {
      const fid = stack.pop()!
      subtree.push(fid)
      const children = byParent.get(fid) || []
      children.forEach((c) => stack.push(c))
    }
    const targets = notes.filter((n) => subtree.includes(n.folderId || ""))
    await Promise.all(targets.map((n) => deleteNote(userId, n.id)))
    await deleteFolder(userId, id)
  }

  const emptyTrash = async () => {
    if (!userId) return
    setBusy(true)
    try {
      await Promise.all(notes.map((n) => deleteNote(userId, n.id)))
      await Promise.all(trashedFolders.map((f) => deleteFolder(userId, f.id)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-full mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Trash2 className="h-5 w-5" /> Lixeira</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/hub/notes")}>Voltar</Button>
          <Button variant="destructive" onClick={emptyTrash} disabled={busy || (notes.length === 0 && trashedFolders.length === 0)}>
            Esvaziar Lixeira
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium mb-2">Pastas</h2>
        <div className="space-y-2">
          {trashedFolders.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma pasta na lixeira.</div>}
          {trashedFolders.map((f) => (
            <div key={f.id} className="flex items-center justify-between border rounded-md p-2">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{f.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => restoreFolder(f.id)}><Undo2 className="h-4 w-4 mr-1" /> Restaurar</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteFolderForever(f.id)}>
                  Excluir permanentemente
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2">Notas</h2>
        <div className="space-y-2">
          {notes.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma nota na lixeira.</div>}
          {notes.map((n) => (
            <div key={n.id} className="flex items-center justify-between border rounded-md p-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[60%]">{n.title || "Sem título"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => restoreNote(n.id)}><Undo2 className="h-4 w-4 mr-1" /> Restaurar</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteNoteForever(n.id)}>
                  Excluir permanentemente
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}


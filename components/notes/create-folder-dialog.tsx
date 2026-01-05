"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderPlus } from "lucide-react"

export default function CreateFolderDialog({
  onCreate,
  triggerText = "Pasta",
  iconOnly = false,
}: {
  onCreate: (name: string) => void | Promise<void>
  triggerText?: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const submit = async () => {
    const n = name.trim()
    if (!n) return
    await onCreate(n)
    setName("")
    setOpen(false)
  }

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("capynotes:open_create_folder_dialog", handler)
    return () => window.removeEventListener("capynotes:open_create_folder_dialog", handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={iconOnly ? "icon" : "sm"} aria-label="Criar pasta">
          <FolderPlus className={iconOnly ? "h-4 w-4" : "h-4 w-4 sm:mr-2"} />
          {iconOnly ? null : <span className="hidden sm:inline">{triggerText}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar nova pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Nome da pasta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!name.trim()}>Criar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

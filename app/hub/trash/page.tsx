"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useNotes, useFolders, useCurrentUserId } from "@/hooks/notes"
import { updateNote, deleteNote } from "@/lib/notes"
import { updateFolder, deleteFolder } from "@/lib/folders"
import { 
  FileText, 
  Folder, 
  Trash2, 
  Undo2, 
  AlertTriangle, 
  CheckSquare, 
  X,
  Loader2
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// --- Componente de Item da Lixeira (Card) ---
const TrashItem = ({ 
  item, 
  type, 
  selected, 
  onToggle, 
  onRestore, 
  onDelete 
}: { 
  item: any, 
  type: "folder" | "note", 
  selected: boolean, 
  onToggle: (id: string, type: "folder" | "note") => void,
  onRestore: (id: string) => void,
  onDelete: (id: string) => void
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "group relative border rounded-xl p-4 transition-all hover:shadow-md bg-card",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            type === "folder" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
          )}>
            {type === "folder" ? <Folder size={20} /> : <FileText size={20} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate block">{item.name || item.title || "Sem título"}</span>
            <span className="text-xs text-muted-foreground capitalize">{type === "folder" ? "Pasta" : "Nota"}</span>
          </div>
        </div>
        
        <Checkbox 
          checked={selected}
          onCheckedChange={() => onToggle(item.id, type)}
          className={cn(
            "transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-0"
          )}
        />
      </div>

      <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 pt-2 border-t">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => onRestore(item.id)}>
          <Undo2 size={14} className="mr-1.5" /> Restaurar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button size="icon" variant="destructive" className="h-8 w-8 shrink-0">
               <Trash2 size={14} />
             </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. {type === "folder" ? "A pasta e todas as notas dentro dela serão perdidas." : "Esta nota será perdida para sempre."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  )
}

// --- Página Principal ---

export default function TrashPage() {
  const router = useRouter()
  const userId = useCurrentUserId()
  const { notes } = useNotes({ trashed: true })
  const { folders } = useFolders()

  const trashedFolders = useMemo(() => folders.filter((f) => !!f.trashed), [folders])
  
  const [busy, setBusy] = useState(false)
  
  // Seleção (guarda IDs)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])

  // --- Handlers Individuais ---

  const restoreNote = async (id: string) => {
    if (!userId) return
    await updateNote(userId, id, { trashed: false })
    setSelectedNotes(prev => prev.filter(i => i !== id))
  }

  const deleteNoteForever = async (id: string) => {
    if (!userId) return
    await deleteNote(userId, id)
    setSelectedNotes(prev => prev.filter(i => i !== id))
  }

  const restoreFolder = async (id: string) => {
    if (!userId) return
    await updateFolder(userId, id, { trashed: false })
    setSelectedFolders(prev => prev.filter(i => i !== id))
  }

  const deleteFolderForever = async (id: string) => {
    if (!userId) return
    // Lógica recursiva original preservada
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
    // Deleta notas dentro da arvore de pastas
    // Precisamos buscar notas deletadas E não deletadas que estavam nessa pasta
    // OBS: A lógica original filtrava 'notes' (que só tem trashed). 
    // Idealmente deveria verificar todas as notas, mas manterei a lógica segura do contexto atual.
    const targets = notes.filter((n) => subtree.includes(n.folderId || ""))
    await Promise.all(targets.map((n) => deleteNote(userId, n.id)))
    await deleteFolder(userId, id)
    
    setSelectedFolders(prev => prev.filter(i => i !== id))
  }

  // --- Handlers em Massa ---

  const handleToggle = (id: string, type: "folder" | "note") => {
    if (type === "folder") {
      setSelectedFolders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    } else {
      setSelectedNotes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }
  }

  const clearSelection = () => {
    setSelectedFolders([])
    setSelectedNotes([])
  }

  const selectAll = () => {
    setSelectedFolders(trashedFolders.map(f => f.id))
    setSelectedNotes(notes.map(n => n.id))
  }

  const bulkRestore = async () => {
    setBusy(true)
    try {
      await Promise.all([
        ...selectedFolders.map(id => restoreFolder(id)),
        ...selectedNotes.map(id => restoreNote(id))
      ])
      clearSelection()
    } finally {
      setBusy(false)
    }
  }

  const bulkDelete = async () => {
    setBusy(true)
    try {
      // Deletar notas selecionadas diretamente
      await Promise.all(selectedNotes.map(id => deleteNoteForever(id)))
      // Deletar pastas (e seus conteúdos)
      for (const id of selectedFolders) {
        await deleteFolderForever(id)
      }
      clearSelection()
    } finally {
      setBusy(false)
    }
  }

  const emptyTrash = async () => {
    if (!userId) return
    setBusy(true)
    try {
      await Promise.all(notes.map((n) => deleteNote(userId, n.id)))
      await Promise.all(trashedFolders.map((f) => deleteFolder(userId, f.id)))
      clearSelection()
    } finally {
      setBusy(false)
    }
  }

  const hasSelection = selectedFolders.length > 0 || selectedNotes.length > 0
  const totalItems = notes.length + trashedFolders.length
  const isEmpty = totalItems === 0

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-destructive" /> 
            Lixeira
          </h1>
          <p className="text-muted-foreground mt-1">
            Recupere itens excluídos ou remova-os permanentemente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/hub/notes")}>
            Voltar para Notas
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={busy || isEmpty}
                className="gap-2"
              >
                <Trash2 size={16} /> Esvaziar Lixeira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você está prestes a excluir permanentemente {totalItems} itens. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={emptyTrash} className="bg-destructive hover:bg-destructive/90">
                  {busy ? <Loader2 className="animate-spin mr-2" /> : null} Esvaziar Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/10"
        >
          <div className="bg-muted p-4 rounded-full mb-4">
            <Trash2 className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium">A lixeira está vazia</h3>
          <p className="text-sm text-muted-foreground mt-1">Tudo limpo por aqui.</p>
        </motion.div>
      )}

      {/* Content */}
      <div className="space-y-8">
        {trashedFolders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                 Pastas <span className="bg-muted text-primary px-2 py-0.5 rounded-full text-xs">{trashedFolders.length}</span>
               </h2>
               {!hasSelection && <Button variant="link" size="sm" onClick={selectAll} className="text-xs h-auto p-0">Selecionar tudo</Button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {trashedFolders.map((f) => (
                  <TrashItem 
                    key={f.id} 
                    item={f} 
                    type="folder" 
                    selected={selectedFolders.includes(f.id)}
                    onToggle={handleToggle}
                    onRestore={restoreFolder}
                    onDelete={deleteFolderForever}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {notes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                 Notas <span className="bg-muted text-primary px-2 py-0.5 rounded-full text-xs">{notes.length}</span>
               </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {notes.map((n) => (
                  <TrashItem 
                    key={n.id} 
                    item={n} 
                    type="note" 
                    selected={selectedNotes.includes(n.id)}
                    onToggle={handleToggle}
                    onRestore={restoreNote}
                    onDelete={deleteNoteForever}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>

      {/* Barra de Ações Flutuante (Bulk Actions) */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-foreground text-background dark:bg-zinc-800 dark:text-zinc-100 px-4 py-2 rounded-full shadow-2xl border border-white/10"
          >
            <div className="flex items-center gap-2 pr-4 border-r border-white/20 mr-2">
              <span className="font-bold text-sm whitespace-nowrap px-2">
                {selectedFolders.length + selectedNotes.length} selecionado(s)
              </span>
              <Button variant="ghost" size="icon" onClick={clearSelection} className="h-6 w-6 hover:bg-white/20 rounded-full">
                <X size={14} className="text-current" />
              </Button>
            </div>
            
            <Button size="sm" variant="ghost" onClick={bulkRestore} disabled={busy} className="hover:bg-white/20 text-current gap-2">
               <Undo2 size={16} /> Restaurar
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={busy} className="hover:bg-red-500/20 text-red-400 hover:text-red-300 gap-2">
                  <Trash2 size={16} /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir itens selecionados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você vai excluir {selectedFolders.length + selectedNotes.length} itens permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
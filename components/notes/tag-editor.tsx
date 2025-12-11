"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { NoteData, TagData } from "@/types"
import { Pencil, Trash2, Plus, X, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

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

export default function TagEditor({
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

  // Ref para focar no input quando começar a editar
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const startEdit = (t: TagData) => {
    setEditingId(t.id)
    setNameInput(t.name)
    setColorInput(t.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNameInput("")
  }

  const saveEdit = () => {
    if (!editingId || !nameInput.trim()) return
    onUpdate(editingId, { name: nameInput.trim(), color: colorInput })
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim(), newColor)
    setNewName("")
    // Opcional: Resetar cor ou manter a última escolhida
    // setNewColor(TAG_COLORS[0]) 
  }

  const handleKeyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const handleKeyDownAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          {tags.length === 0 && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="text-sm text-muted-foreground text-center py-4"
             >
                Nenhuma etiqueta criada.
             </motion.div>
          )}

          {tags.map((t) => {
            const count = allNotes.filter((n) => (n.tagIds || []).includes(t.id)).length
            const isEditing = editingId === t.id

            return (
              <motion.div
                key={t.id}
                layout // Permite que os itens deslizem suavemente quando a altura de um muda
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isEditing ? "bg-accent/30 border-primary/50" : "hover:bg-accent/50 border-transparent"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex items-center gap-3">
                    {/* Visualização da Cor (Bolinha) */}
                    <motion.span
                      layoutId={`color-${t.id}`}
                      className="inline-block size-3 rounded-full shrink-0 shadow-sm"
                      style={{ 
                        backgroundColor: (isEditing ? colorInput : t.color) || TAG_COLORS[0] 
                      }}
                    />

                    {isEditing ? (
                      <Input
                        ref={editInputRef}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={handleKeyDownEdit}
                        className="h-8 flex-1"
                        placeholder="Nome da etiqueta"
                      />
                    ) : (
                      <motion.span layout="position" className="font-medium text-sm truncate">
                        {t.name}
                      </motion.span>
                    )}

                    {!isEditing && (
                      <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                        {count}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={saveEdit} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30">
                          <Check size={16} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={cancelEdit} className="h-8 w-8 text-muted-foreground">
                          <X size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => startEdit(t)} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(t.id)} className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Seletor de Cores (Modo Edição) */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        {TAG_COLORS.map((c) => (
                          <ColorButton
                            key={c}
                            color={c}
                            isSelected={colorInput === c}
                            onClick={() => setColorInput(c)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <Separator />

      {/* Adicionar Nova Label */}
      <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-dashed">
        <div className="text-sm font-semibold text-muted-foreground">Nova Etiqueta</div>
        <div className="flex gap-2">
           <Input 
              placeholder="Nome da etiqueta..." 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              onKeyDown={handleKeyDownAdd}
              className="bg-background"
           />
           <Button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="shrink-0"
           >
              <Plus className="mr-2 size-4" /> Adicionar
           </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {TAG_COLORS.map((c) => (
            <ColorButton
               key={c}
               color={c}
               isSelected={newColor === c}
               onClick={() => setNewColor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Pequeno componente auxiliar para o botão de cor com animação
function ColorButton({ color, isSelected, onClick }: { color: string, isSelected: boolean, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "size-6 rounded-full border-2 transition-all",
        isSelected ? "border-primary ring-2 ring-offset-2 ring-primary/30" : "border-transparent"
      )}
      style={{ backgroundColor: color }}
      type="button"
      aria-label={`Selecionar cor ${color}`}
    />
  )
}
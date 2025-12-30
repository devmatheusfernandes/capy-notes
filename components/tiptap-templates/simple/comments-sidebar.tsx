"use client"

import * as React from "react"
import UniversalSidebar from "@/components/tiptap-templates/simple/universal-sidebar"
import type { CommentData } from "@/types"
import { Pencil, Trash2, X, Check, MessageSquarePlus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type CommentsSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  desktopWidth?: number | string
  hasPendingComment: boolean
  newCommentText: string
  onChangePendingText: (text: string) => void
  comments: CommentData[]
  editingId: string | null
  onToggleEdit: (id: string) => void
  onSelectComment: (id: string) => void
  onDeleteComment: (id: string) => void | Promise<void>
  onEditCommentText: (id: string, text: string) => void | Promise<void>
  activeId?: string | null
}

// Variantes de animação para os cards
const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    height: 0, 
    marginBottom: 0,
    transition: { duration: 0.2 } 
  }
}

export default function CommentsSidebar({
  open,
  onOpenChange,
  title = "Comentários",
  desktopWidth = "26%", // Levemente mais largo para respirar melhor
  hasPendingComment,
  newCommentText,
  onChangePendingText,
  comments,
  editingId,
  onToggleEdit,
  onSelectComment,
  onDeleteComment,
  onEditCommentText,
  activeId,
}: CommentsSidebarProps) {
  
  // Referência para focar na textarea quando abrir edição
  const editInputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      // Coloca o cursor no final do texto
      editInputRef.current.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length
      )
    }
  }, [editingId])

  return (
    <UniversalSidebar
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desktopWidth={desktopWidth}
    >
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-900/50">
        
        {/* Área de Novo Comentário */}
        <AnimatePresence>
          {hasPendingComment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 pb-0 overflow-hidden"
            >
              <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/50 shadow-sm rounded-xl p-3 ring-2 ring-indigo-500/10">
                <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-medium text-xs uppercase tracking-wider">
                  <MessageSquarePlus className="size-3.5" />
                  Novo Comentário
                </div>
                <textarea
                  className="w-full bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground/50 min-h-[80px]"
                  placeholder="Digite seu comentário..."
                  value={newCommentText}
                  onChange={(e) => onChangePendingText(e.target.value)}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de Comentários */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {comments.length === 0 && !hasPendingComment ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-center text-muted-foreground text-sm py-10"
              >
                Nenhum comentário ainda.
              </motion.div>
            ) : (
              comments.map((c) => (
                <motion.div
                  layoutId={c.id}
                  key={c.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`group relative rounded-xl border bg-card p-4 text-sm transition-all hover:shadow-md 
                    ${editingId === c.id
                      ? "ring-2 ring-indigo-500/20 border-indigo-500/50 shadow-md"
                      : "border-border shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800"}
                    ${activeId === c.id ? "ring-2 ring-indigo-500/20 border-indigo-400" : ""}`}
                  onClick={() => onSelectComment(c.id)}
                >
                  {/* Cabeçalho do Card: Snippet (Texto Referenciado) */}
                  <div className="mb-3 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700">
                    <p className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed">
                      "{c.snippet}"
                    </p>
                  </div>

                  {/* Ações (Editar/Excluir) */}
                  {editingId !== c.id && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition-colors"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onToggleEdit(c.id)
                        }}
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          void onDeleteComment(c.id)
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Conteúdo ou Modo Edição */}
                  {editingId === c.id ? (
                    <div className="relative">
                      <textarea
                        ref={editInputRef}
                        className="w-full rounded-md bg-slate-50 dark:bg-zinc-800/50 p-2 text-sm outline-none focus:ring-0 resize-none min-h-[80px]"
                        value={c.text}
                        onChange={(e) => onEditCommentText(c.id, e.target.value)}
                      />
                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEdit("") // Fecha edição
                          }}
                          className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <Check className="size-3" /> Concluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {c.text || <span className="text-muted-foreground italic">(sem conteúdo)</span>}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </UniversalSidebar>
  )
}

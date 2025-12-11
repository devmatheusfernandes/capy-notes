"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Pin, Folder as FolderIcon } from "lucide-react"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from "@/components/ui/context-menu"

export interface FolderItemProps {
  id: string
  title: string
  itemCount?: string | number // Renomeado de subtitle para ser mais semântico
  icon?: React.ReactNode // Opcional, usa default se não passar
  selected: boolean
  view: "list" | "grid"
  onToggleSelect: (id: string) => void
  onClick: () => void
  contextMenu: React.ReactNode
  actionsMenu: React.ReactNode
  hasSelectionMode: boolean
  pinned?: boolean
}

export default function FolderItem({
  id,
  title,
  itemCount,
  icon,
  selected,
  view,
  onToggleSelect,
  onClick,
  contextMenu,
  actionsMenu,
  hasSelectionMode,
  pinned,
}: FolderItemProps) {
  const isGrid = view === "grid"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("break-inside-avoid mb-3", isGrid ? "w-full" : "")}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative group rounded-xl border p-4 transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-300 ease-in-out",
              selected ? "border-primary bg-accent/50 ring-1 ring-primary/20" : "border-border/60 bg-card",
              // Grid: Compacto e centrado verticalmente se pouco conteúdo
              // List: Row padrão
              isGrid 
                ? "flex flex-row gap-3 h-auto min-h-[4rem] justify-center items-center" 
                : "flex items-center gap-4 h-16"
            )}
            onClick={(e) => {
              if (hasSelectionMode) {
                e.preventDefault()
                onToggleSelect(id)
                return
              }
              if ((e.target as HTMLElement).closest('[data-card-control="true"]')) return
              onClick()
            }}
          >
            {/* Ícone da Pasta */}
            <div className={cn(
              "shrink-0 flex items-center justify-center rounded-lg transition-colors",
              isGrid ? "bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 w-fit" : "text-blue-600 dark:text-blue-400"
            )}>
              {icon || <FolderIcon size={isGrid ? 24 : 20} />}
            </div>

            {/* Conteúdo de Texto */}
            <div className="flex-1 min-w-0 w-full">
              <div className="font-semibold flex items-center gap-2 mb-0.5">
                <span className="truncate flex-1 flex items-center gap-2">
                  {title}
                  {pinned && <Pin className="h-3 w-3 text-muted-foreground rotate-45" />}
                </span>
              </div>
              
              {/* Contagem de itens (subtítulo) */}
              {itemCount !== undefined && (
                <div className="text-xs text-muted-foreground truncate">
                  {itemCount}
                </div>
              )}
            </div>

            {/* Controles (Checkbox & Menu) */}
            <div
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1 z-10",
                // No mobile ou se selecionado: visível. Desktop hover: visível.
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity md:opacity-0"
              )}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(id)}
                className="bg-background/80 backdrop-blur data-[state=checked]:bg-primary shadow-sm border-muted-foreground/30"
                data-card-control="true"
                onClick={(e) => e.stopPropagation()}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-sm hover:bg-background" 
                    data-card-control="true"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {actionsMenu}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>{contextMenu}</ContextMenuContent>
      </ContextMenu>
    </motion.div>
  )
}
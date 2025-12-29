"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Pin, Folder as FolderIcon } from "lucide-react"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from "@/components/ui/context-menu"
import { useState } from "react"

export interface FolderItemProps {
  id: string
  title: string
  itemCount?: string | number 
  icon?: React.ReactNode 
  selected: boolean
  view: "list" | "grid"
  onToggleSelect: (id: string) => void
  onClick: () => void
  contextMenu: React.ReactNode
  actionsMenu: React.ReactNode
  hasSelectionMode: boolean
  pinned?: boolean
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
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
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: FolderItemProps) {
  const isGrid = view === "grid"
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Verifica se não estamos arrastando a própria pasta
    // (Pode ser melhorado checando ID, mas aqui é visual)
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop?.(e);
  };

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
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={(e) => {
              onDragOver?.(e);
              handleDragEnter(e);
            }}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative group rounded-lg border p-4 cursor-pointer transition-all duration-200",
              selected ? "border-primary ring-1 ring-primary/20" : "border-border/60",
              isDragOver ? "bg-primary/20 scale-105 border-primary ring-2 ring-primary shadow-lg z-10" : "hover:bg-secondary-foreground/30 hover:text-accent-foreground",
              !isDragOver && "bg-secondary-foreground/20",
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
              isGrid ? "bg-primary/20 text-primary p-2 w-fit" : "text-primary"
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
                    className="h-8 w-8 rounded-full bg-background/20 ease-in-out duration-200 transition-all" 
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
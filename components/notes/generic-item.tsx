"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Pin } from "lucide-react"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from "@/components/ui/context-menu"

export interface ItemProps {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  selected: boolean
  view: "list" | "grid"
  onToggleSelect: (id: string) => void
  onClick: () => void
  contextMenu: React.ReactNode
  actionsMenu: React.ReactNode
  hasSelectionMode: boolean
  pinned?: boolean
}

export default function GenericItem({
  id,
  title,
  subtitle,
  icon,
  selected,
  view,
  onToggleSelect,
  onClick,
  contextMenu,
  actionsMenu,
  hasSelectionMode,
  pinned,
}: ItemProps) {
  const isGrid = view === "grid"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn("break-inside-avoid mb-3", isGrid ? "w-full" : "")}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative group rounded-lg border p-4 transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground",
              selected ? "border-primary bg-accent/50" : "border-border",
              isGrid ? "flex flex-col h-auto gap-3 items-start justify-start" : "flex items-center gap-4 h-auto min-h-[5rem]"
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
            {icon ? <div className="shrink-0 text-muted-foreground">{icon}</div> : null}
            <div className="flex-1 min-w-0 w-full">
              <div className="font-medium flex items-center justify-between gap-2 mb-1">
                <span className="truncate w-full flex items-center gap-2">
                  {pinned ? <Pin className="h-3 w-3 text-primary" /> : null}
                  {title}
                </span>
              </div>
              <div className={cn("text-xs text-muted-foreground break-words whitespace-pre-wrap", isGrid ? "line-clamp-[8]" : "line-clamp-1")}>{subtitle}</div>
            </div>
            <div
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity md:opacity-0"
              )}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(id)}
                className="bg-background data-[state=checked]:bg-primary"
                data-card-control="true"
                onClick={(e) => e.stopPropagation()}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 bg-background/80 backdrop-blur-sm" data-card-control="true">
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

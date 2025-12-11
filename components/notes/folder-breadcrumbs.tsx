"use client"

import { Button } from "@/components/ui/button"
import type { BreadcrumbItem } from "@/types"
import { ChevronRight, Home } from "lucide-react"

export default function FolderBreadcrumbs({ path, onNavigate }: { path: BreadcrumbItem[]; onNavigate: (folderId?: string) => void }) {
  return (
    <div className="flex items-center space-x-1 text-sm text-muted-foreground overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
        onClick={() => onNavigate()}
     >
        <Home className="h-3 w-3 mr-1" />
        Início
      </Button>
      {path.map((item) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-3 w-3 mx-1 shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
            onClick={() => onNavigate(item.id)}
          >
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  )
}


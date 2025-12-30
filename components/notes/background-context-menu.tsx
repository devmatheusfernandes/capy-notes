
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileText, FolderPlus } from "lucide-react";

interface BackgroundContextMenuProps {
  children: React.ReactNode;
  onNewNote: () => void;
  onNewFolder: () => void;
}

export function BackgroundContextMenu({
  children,
  onNewNote,
  onNewFolder,
}: BackgroundContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="h-full w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onSelect={onNewNote}>
          <FileText className="mr-2 h-4 w-4" />
          Nova Nota
        </ContextMenuItem>
        <ContextMenuItem onSelect={onNewFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Nova Pasta
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

import { motion } from "framer-motion";
import { CheckSquare, Square, MoreVertical, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getChecklistItems, getCoverImage, getPreviewText } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteData, TagData } from "@/types";

interface NoteCardProps {
  note: NoteData;
  tags: TagData[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: () => void;
  onCheck: (noteId: string, itemIndex: number) => void; // Prop para interatividade
  contextMenu: React.ReactNode;
  actionsMenu: React.ReactNode;
  hasSelectionMode: boolean;
}

export function NoteCard({
  note,
  tags,
  selected,
  onToggleSelect,
  onClick,
  onCheck,
  contextMenu,
  actionsMenu,
  hasSelectionMode,
}: NoteCardProps) {
  // Extração de dados usando os helpers
  const coverImage = getCoverImage(note);
  const checklist = getChecklistItems(note);
  const hasChecklist = checklist.length > 0;
  
  // Filtra tags visuais
  const noteTags = tags.filter((t) => (note.tagIds || []).includes(t.id));

  // @ts-ignore
  const isPdf = note.type === "pdf" || note.content?.content?.[0]?.type === "pdf";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="break-inside-avoid mb-4 group relative"
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={(e) => {
              // Lógica de seleção vs navegação
              if (hasSelectionMode) {
                e.preventDefault();
                onToggleSelect(note.id);
                return;
              }
              // Se clicou em um controle (botão/checkbox interno), não abre a nota
              if ((e.target as HTMLElement).closest('[data-card-control="true"]')) return;
              onClick();
            }}
            className={cn(
              "flex flex-col w-full rounded-lg border hover:bg-secondary-foreground/30 hover:text-accent-foreground",
              "bg-secondary-foreground/20 hover:bg-secondary-foreground/30",
              selected ? "border-primary ring-1 ring-primary/20" : "border-border/60"
            )}
          >
            {/* 1. Imagem de Capa */}
            {coverImage && (
              <div className="w-full h-40 overflow-hidden relative bg-muted">
                <img
                  src={coverImage}
                  alt="Cover"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            <div className="p-5 flex flex-col gap-3">
              {/* Título */}
            <div className="font-bold text-lg leading-tight break-words flex items-center gap-2">
              {note.title || <span className="text-muted-foreground italic font-normal">Sem título</span>}
              {isPdf && <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5"><FileText className="w-3 h-3 mr-1" />PDF</Badge>}
            </div>

            {/* 2. Conteúdo Dinâmico */}
              {hasChecklist ? (
                // --- RENDERIZAÇÃO DE CHECKLIST ---
                <div className="space-y-2 mt-1">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-sm text-muted-foreground/90 group/item"
                    >
                      {/* Checkbox Interativo */}
                      <button
                        type="button"
                        data-card-control="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheck(note.id, idx);
                        }}
                        className={cn(
                          "mt-0.5 shrink-0 transition-colors rounded-sm p-0.5 -ml-0.5",
                          item.checked 
                            ? "text-primary hover:text-primary/80" 
                            : "text-muted-foreground/50 hover:text-primary hover:bg-muted"
                        )}
                      >
                        {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      
                      {/* Texto do Item */}
                      <span
                        className={cn(
                          "truncate transition-all select-none",
                          item.checked && "line-through text-muted-foreground/60"
                        )}
                      >
                        {item.label || <span className="italic opacity-50">Item vazio</span>}
                      </span>
                    </div>
                  ))}
                  {/* Indicador se houver mais itens */}
                  {checklist.length === 5 && (
                    <div className="text-xs text-muted-foreground pl-6 pt-1">...ver mais</div>
                  )}
                </div>
              ) : (
                // --- RENDERIZAÇÃO DE TEXTO ---
                <div className="text-sm text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap break-words">
                  {isPdf ? "Documento PDF" : getPreviewText(note, coverImage ? 120 : 300)}
                </div>
              )}

              {/* 3. Rodapé com Tags */}
              {noteTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2">
                  {noteTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-background/50 max-w-full truncate"
                      style={{
                        borderColor: tag.color ? `${tag.color}40` : undefined,
                        color: tag.color,
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full mr-1.5 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Controles Absolutos (Checkbox de Seleção & Menu) */}
            <div className={cn(
               "absolute top-3 right-3 flex items-center gap-1 z-10",
               // Visível se selecionado, ou no hover (desktop), ou foco
               selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity md:opacity-0"
            )}>
              {/* Checkbox de Seleção do Card */}
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(note.id)}
                className="bg-background/80 backdrop-blur data-[state=checked]:bg-primary shadow-sm border-white/50"
                data-card-control="true"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Menu de Ações */}
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/20 ease-in-out duration-200 transition-all" 
                    data-card-control="true"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {actionsMenu}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        
        {/* Menu de Contexto (Botão Direito) */}
        <ContextMenuContent>{contextMenu}</ContextMenuContent>
      </ContextMenu>
    </motion.div>
  );
}

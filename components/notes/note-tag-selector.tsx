
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { TagData } from "@/types";
import { updateNote } from "@/lib/notes";
import { useCurrentUserId } from "@/hooks/notes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NoteTagSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  initialTagIds: string[];
  allTags: TagData[];
}

export function NoteTagSelector({
  open,
  onOpenChange,
  noteId,
  initialTagIds,
  allTags,
}: NoteTagSelectorProps) {
  const userId = useCurrentUserId();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTagIds(initialTagIds || []);
    }
  }, [open, initialTagIds]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateNote(userId, noteId, { tagIds: selectedTagIds });
      toast.success("Etiquetas atualizadas!");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar etiquetas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Etiquetas</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma etiqueta criada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                      isSelected
                        ? "bg-secondary text-secondary-foreground border-primary/50"
                        : "hover:bg-muted"
                    )}
                    style={{
                      borderColor: isSelected ? tag.color : undefined,
                    }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color || "#8884d8" }}
                    />
                    <span className="text-sm font-medium">{tag.name}</span>
                    {isSelected && <Check className="h-3 w-3 ml-1" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TagData, NoteData } from "@/types";
import { updateNote } from "@/lib/notes";
import { useCurrentUserId } from "@/hooks/notes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BatchTagEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNoteIds: string[];
  allNotes: NoteData[];
  tags: TagData[];
  onSuccess?: () => void;
}

type TagState = boolean | "indeterminate";

export function BatchTagEditorDialog({
  open,
  onOpenChange,
  selectedNoteIds,
  allNotes,
  tags,
  onSuccess,
}: BatchTagEditorDialogProps) {
  const userId = useCurrentUserId();
  const [tagStates, setTagStates] = useState<Record<string, TagState>>({});
  const [saving, setSaving] = useState(false);

  // Calcula o estado inicial das tags baseado nas notas selecionadas
  useEffect(() => {
    if (open && selectedNoteIds.length > 0) {
      const selectedNotes = allNotes.filter((n) =>
        selectedNoteIds.includes(n.id)
      );
      const newStates: Record<string, TagState> = {};

      tags.forEach((tag) => {
        const notesWithTag = selectedNotes.filter((n) =>
          (n.tagIds || []).includes(tag.id)
        );

        if (notesWithTag.length === 0) {
          newStates[tag.id] = false;
        } else if (notesWithTag.length === selectedNotes.length) {
          newStates[tag.id] = true;
        } else {
          newStates[tag.id] = "indeterminate";
        }
      });

      setTagStates(newStates);
    }
  }, [open, selectedNoteIds, allNotes, tags]);

  const handleToggle = (tagId: string) => {
    setTagStates((prev) => {
      const current = prev[tagId];
      // Ciclo: Indeterminate -> Checked -> Unchecked -> Checked
      let next: TagState;
      if (current === "indeterminate") {
        next = true;
      } else if (current === true) {
        next = false;
      } else {
        next = true;
      }
      return { ...prev, [tagId]: next };
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const selectedNotes = allNotes.filter((n) =>
        selectedNoteIds.includes(n.id)
      );

      const updates = selectedNotes.map((note) => {
        let newTagIds = new Set(note.tagIds || []);

        tags.forEach((tag) => {
          const state = tagStates[tag.id];
          if (state === true) {
            newTagIds.add(tag.id);
          } else if (state === false) {
            newTagIds.delete(tag.id);
          }
          // se for indeterminate, não faz nada (mantém como estava)
        });

        // Só atualiza se houve mudança
        const currentTagIds = new Set(note.tagIds || []);
        if (
          newTagIds.size !== currentTagIds.size ||
          [...newTagIds].some((id) => !currentTagIds.has(id))
        ) {
          return updateNote(userId, note.id, {
            tagIds: Array.from(newTagIds),
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updates);
      toast.success("Etiquetas atualizadas com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar etiquetas em massa:", error);
      toast.error("Erro ao atualizar etiquetas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Etiquetas ({selectedNoteIds.length})</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma etiqueta disponível.
            </p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                onClick={() => handleToggle(tag.id)}
              >
                <Checkbox
                  checked={tagStates[tag.id]}
                  onCheckedChange={() => handleToggle(tag.id)}
                  id={`tag-${tag.id}`}
                />
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: tag.color || "#8884d8" }}
                  />
                  <label
                    htmlFor={`tag-${tag.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {tag.name}
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

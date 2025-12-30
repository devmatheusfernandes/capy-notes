
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCloudBackups, BackupMetadata } from "@/hooks/useCloudBackups";
import { Loader2, Cloud, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { NoteData, TagData } from "@/types";
import { mergeNotesToBackup } from "@/lib/jwl-merge";

interface ExportToJwlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNotes: NoteData[];
  allTags: TagData[];
  onSuccess?: () => void;
}

export function ExportToJwlDialog({ 
  open, 
  onOpenChange, 
  selectedNotes, 
  allTags,
  onSuccess 
}: ExportToJwlDialogProps) {
  const { backups, fetchBackups, fetchBackupFile, saveChanges, loadingList } = useCloudBackups();
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBackups();
    }
  }, [open]);

  const handleExport = async () => {
    if (!selectedBackupId) return;

    const backup = backups.find(b => b.id === selectedBackupId);
    if (!backup) return;

    setIsProcessing(true);
    const toastId = toast.loading("Processando exportação...");

    try {
      // 1. Baixar o backup selecionado
      const backupBlob = await fetchBackupFile(backup.storagePath);
      if (!backupBlob) throw new Error("Falha ao baixar backup da nuvem");

      // 2. Mesclar as notas selecionadas
      const updatedBlob = await mergeNotesToBackup(backupBlob, selectedNotes, allTags);

      // 3. Salvar de volta na nuvem
      await saveChanges(backup.id, backup.storagePath, updatedBlob, backup.name + ".jwlibrary");

      toast.success("Notas exportadas para o backup com sucesso!", { id: toastId });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar notas.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exportar para JW Library</DialogTitle>
          <DialogDescription>
            Selecione um backup existente na nuvem para adicionar as {selectedNotes.length} notas selecionadas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Backups Disponíveis</h4>
          {loadingList ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center p-4 border rounded-md text-muted-foreground text-sm">
              Nenhum backup encontrado na nuvem.
              <br/>Faça upload de um backup primeiro em "Biblioteca".
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-1">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    onClick={() => setSelectedBackupId(backup.id)}
                    className={`
                      flex items-center p-2 rounded-md cursor-pointer transition-colors
                      ${selectedBackupId === backup.id 
                        ? "bg-primary/10 border-primary border" 
                        : "hover:bg-muted border border-transparent"}
                    `}
                  >
                    <Cloud className="h-4 w-4 mr-3 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(backup.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedBackupId === backup.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={!selectedBackupId || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Exportar Notas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

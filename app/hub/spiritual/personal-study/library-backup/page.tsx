"use client";

import { useEffect, useState } from "react";
import { useJwlEditor, Note } from "@/hooks/useJwlEditor";
import { useCloudBackups, BackupMetadata } from "@/hooks/useCloudBackups";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Cloud, Upload, Edit, Trash2, ArrowLeft, Save, Download, Merge, Plus } from "lucide-react";
import { saveAs } from "file-saver";

export default function CloudBackupPage() {
  const [user, setUser] = useState<any>(null);
  const { 
    loadFile, notes, updateNote, generateUpdatedBlob, mergeBackup, // Importado novo
    isLoading: isEditorLoading, isMerging, hasLoaded 
  } = useJwlEditor();
  
  const { backups, importBackup, saveChanges, fetchBackupFile, deleteBackup, fetchBackups, loadingList } = useCloudBackups();
  const [activeBackup, setActiveBackup] = useState<BackupMetadata | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Edição
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchBackups();
    });
    return () => unsub();
  }, []);

  // --- Handlers ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await importBackup(e.target.files[0]);
  };

  const handleMergeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      if(confirm(`Deseja mesclar as anotações de "${e.target.files[0].name}" neste backup atual?`)) {
        await mergeBackup(e.target.files[0]);
        // Limpa o input
        e.target.value = ""; 
      }
    }
  };

  const openEditor = async (backup: BackupMetadata) => {
    const blob = await fetchBackupFile(backup.storagePath);
    if (blob) {
      await loadFile(blob);
      setActiveBackup(backup);
    } else {
      alert("Erro ao baixar arquivo.");
    }
  };

  const handleCloudSave = async () => {
    if (!activeBackup) return;
    setIsSavingCloud(true);
    const newBlob = await generateUpdatedBlob();
    if (newBlob) await saveChanges(activeBackup.id, activeBackup.storagePath, newBlob);
    setIsSavingCloud(false);
  };

  const handleExportLocal = async () => {
    const blob = await generateUpdatedBlob();
    if (blob) saveAs(blob, `${activeBackup?.name || "backup"}_merged.jwlibrary`);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.Content || "");
    setEditTitle(note.Title || "");
    setIsDialogOpen(true);
  };

  const saveNoteEdit = () => {
    if (editingNote) {
      updateNote(editingNote.NoteId, editContent, editTitle);
      setIsDialogOpen(false);
    }
  };

  if (!user) return <div className="p-10 text-center">Faça login para gerenciar backups.</div>;

  // --- MODO EDITOR ---
  if (activeBackup && hasLoaded) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Barra de Topo */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Button variant="outline" onClick={() => setActiveBackup(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          
          <div className="flex flex-wrap gap-2 justify-end">
            {/* Botão de Merge */}
            <div className="relative">
              <input 
                type="file" 
                id="merge-input" 
                className="hidden" 
                accept=".jwlibrary" 
                onChange={handleMergeUpload}
                disabled={isMerging}
              />
              <label htmlFor="merge-input">
                <Button asChild variant="secondary" disabled={isMerging} className="cursor-pointer bg-purple-100 text-purple-900 hover:bg-purple-200 border-purple-200">
                  <span>
                    {isMerging ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Merge className="mr-2 h-4 w-4"/>}
                    Mesclar outro Backup
                  </span>
                </Button>
              </label>
            </div>

            <Button onClick={handleCloudSave} disabled={isSavingCloud}>
              {isSavingCloud ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
              Salvar na Nuvem
            </Button>
            
            <Button variant="outline" onClick={handleExportLocal}>
              <Download className="mr-2 h-4 w-4"/> Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5"/> Editor: {activeBackup.name}
            </CardTitle>
            <CardDescription>{notes.length} notas carregadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.NoteId}>
                    <TableCell className="font-bold text-sm w-[200px]">{note.Title || "Sem título"}</TableCell>
                    <TableCell className="max-w-xl truncate text-gray-600">{note.Content}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditNote(note)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Nota</DialogTitle></DialogHeader>
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" className="mb-2"/>
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8} />
            <DialogFooter>
              <Button onClick={saveNoteEdit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- MODO DASHBOARD ---
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cloud className="h-8 w-8 text-blue-500" /> Meus Backups
        </h1>
        <label htmlFor="upload-backup">
           <div className="flex items-center justify-center px-4 py-2 bg-black text-white rounded-md cursor-pointer hover:bg-gray-800 transition shadow-md">
             <Plus className="mr-2 h-4 w-4" /> Importar Novo
           </div>
        </label>
        <Input id="upload-backup" type="file" accept=".jwlibrary" className="hidden" onChange={handleImport} />
      </div>

      {loadingList ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {backups.map((bkp) => (
            <Card key={bkp.id} className="hover:shadow-lg transition border-l-4 border-l-blue-500 flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="truncate text-lg">{bkp.name}</CardTitle>
                <CardDescription>
                  {new Date(bkp.updatedAt).toLocaleDateString()} às {new Date(bkp.updatedAt).toLocaleTimeString().slice(0,5)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between mt-auto">
                <Button variant="default" size="sm" onClick={() => openEditor(bkp)}>
                  {isEditorLoading ? <Loader2 className="animate-spin h-4 w-4"/> : "Abrir Editor"}
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteBackup(bkp.id, bkp.storagePath)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
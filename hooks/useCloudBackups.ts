"use client";

import { useState, useEffect } from "react";
import { 
  collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc 
} from "firebase/firestore";
import { 
  ref, uploadBytes, getDownloadURL, deleteObject 
} from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { toast } from "sonner";

export type BackupMetadata = {
  id: string;
  name: string;
  updatedAt: string; // ISO String
  storagePath: string;
};

export const useCloudBackups = () => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // 1. Listar Backups do Usuário
  const fetchBackups = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingList(true);
    
    try {
      const q = query(collection(db, "users", user.uid, "backups"));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BackupMetadata[];
      
      // Ordenar por data (mais recente primeiro)
      setBackups(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error("Erro ao buscar backups:", error);
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Importar Novo (Upload Inicial)
  const importBackup = async (file: File) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // A. Upload para o Storage
      const storagePath = `users/${user.uid}/backups/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      // B. Salvar Metadados no Firestore
      await addDoc(collection(db, "users", user.uid, "backups"), {
        name: file.name.replace(".jwlibrary", ""),
        updatedAt: new Date().toISOString(),
        storagePath: storagePath
      });

      await fetchBackups();
      toast.success("Backup importado com sucesso");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar backup");
    }
  };

  // 3. Salvar Alterações (Sobrescrever ou Criar Novo)
  const saveChanges = async (backupId: string, storagePath: string, newBlob: Blob, newName: string = "backup_novo.jwlibrary") => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      let finalStoragePath = storagePath;
      let finalBackupId = backupId;

      // Se for um backup novo (sem path ou ID temporário)
      if (!finalStoragePath || backupId === "new-temp") {
        const fileName = `${Date.now()}_${newName}`;
        finalStoragePath = `users/${user.uid}/backups/${fileName}`;
        
        // Upload
        const storageRef = ref(storage, finalStoragePath);
        await uploadBytes(storageRef, newBlob);

        // Criar no Firestore
        const docRef = await addDoc(collection(db, "users", user.uid, "backups"), {
          name: newName.replace(".jwlibrary", ""),
          updatedAt: new Date().toISOString(),
          storagePath: finalStoragePath
        });
        
        finalBackupId = docRef.id;
        toast.success("Novo backup criado na nuvem!");
      } else {
        // Atualização de backup existente
        const storageRef = ref(storage, finalStoragePath);
        await uploadBytes(storageRef, newBlob);

        const backupRef = doc(db, "users", user.uid, "backups", finalBackupId);
        await updateDoc(backupRef, {
          updatedAt: new Date().toISOString()
        });
        toast.success("Backup atualizado com sucesso");
      }
      
      await fetchBackups();
      return { id: finalBackupId, storagePath: finalStoragePath };

    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast.error("Erro ao persistir dados");
      return null;
    }
  };

  // 4. Carregar Conteúdo (Download do Storage para memória)
  const fetchBackupFile = async (storagePath: string): Promise<Blob | null> => {
    try {
      const url = await getDownloadURL(ref(storage, storagePath));
      const response = await fetch(url);
      return await response.blob();
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      return null;
    }
  };
  
  // 5. Deletar Backup
  const deleteBackup = async (backupId: string, storagePath: string) => {
      const user = auth.currentUser;
      if(!user) return;
      
      if(!confirm("Tem certeza? Isso apagará o backup permanentemente.")) return;

      try {
          // Deleta do Storage
          await deleteObject(ref(storage, storagePath));
          // Deleta do Firestore
          await deleteDoc(doc(db, "users", user.uid, "backups", backupId));
          await fetchBackups();
          toast.success("Backup deletado com sucesso");
      } catch (error) {
          console.error("Erro ao deletar", error);
          toast.error("Erro ao deletar backup");
      }
  }

  return { backups, importBackup, saveChanges, fetchBackupFile, deleteBackup, fetchBackups, loadingList };
};

import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import type { FolderData } from "@/types"

export async function createFolder(userId: string, name: string, parentId?: string, color?: string): Promise<FolderData> {
  const now = new Date().toISOString()
  const col = collection(db, "users", userId, "folders")
  const ref = doc(col)
  const folder: FolderData = {
    id: ref.id,
    name,
    ...(parentId !== undefined ? { parentId } : {}),
    ...(color !== undefined ? { color } : {}),
    archived: false,
    trashed: false,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(ref, folder)
  return folder
}

export function subscribeFolders(userId: string, onData: (folders: FolderData[]) => void) {
  const ref = collection(db, "users", userId, "folders")
  return onSnapshot(ref, (snap) => {
    const folders = snap.docs.map((d) => d.data() as FolderData)
    onData(folders)
  })
}

export async function updateFolder(userId: string, folderId: string, updates: Partial<FolderData>) {
  const ref = doc(db, "users", userId, "folders", folderId)
  const now = new Date().toISOString()
  const safe = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)) as Partial<FolderData>
  await updateDoc(ref, { ...safe, updatedAt: now })
}

export async function deleteFolder(userId: string, folderId: string) {
  const ref = doc(db, "users", userId, "folders", folderId)
  await deleteDoc(ref)
}

export function getSubfolders(all: FolderData[], parentId?: string): FolderData[] {
  return all.filter((f) => f.parentId === parentId)
}

export function getFolderPath(all: FolderData[], folderId: string): FolderData[] {
  const byId = new Map(all.map((f) => [f.id, f]))
  const path: FolderData[] = []
  let current = byId.get(folderId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

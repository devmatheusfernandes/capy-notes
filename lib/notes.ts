import { db } from "@/lib/firebase"
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore"
import { deleteImageFromStorage } from "@/lib/tiptap-utils"
import type { NoteData } from "@/types"

export async function createNote(userId: string, overrides: Partial<NoteData> = {}): Promise<NoteData> {
  const now = new Date().toISOString()
  const notesCol = collection(db, "users", userId, "notes")
  const ref = doc(notesCol)
  const note = {
    id: ref.id,
    title: overrides.title ?? "Nova nota",
    content: overrides.content ?? { type: "doc", content: [{ type: "paragraph" }] },
    ...(overrides.tagIds !== undefined ? { tagIds: overrides.tagIds } : {}),
    ...(overrides.folderId !== undefined ? { folderId: overrides.folderId } : {}),
    archived: overrides.archived ?? false,
    trashed: overrides.trashed ?? false,
    pinned: overrides.pinned ?? false,
    createdAt: now,
    updatedAt: now,
  } as NoteData
  await setDoc(ref, note)
  return note
}

export async function getNote(userId: string, noteId: string): Promise<NoteData | null> {
  const ref = doc(db, "users", userId, "notes", noteId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as NoteData) : null
}

export function subscribeNote(userId: string, noteId: string, onData: (note: NoteData | null) => void) {
  const ref = doc(db, "users", userId, "notes", noteId)
  return onSnapshot(ref, (snap) => {
    onData(snap.exists() ? (snap.data() as NoteData) : null)
  })
}

export function subscribeNotes(userId: string, onData: (notes: NoteData[]) => void) {
  const ref = collection(db, "users", userId, "notes")
  return onSnapshot(ref, (snap) => {
    const notes = snap.docs.map((d) => d.data() as NoteData)
    onData(notes)
  })
}

export async function updateNote(userId: string, noteId: string, updates: Partial<NoteData>) {
  const ref = doc(db, "users", userId, "notes", noteId)
  const now = new Date().toISOString()
  const entries = Object.entries(updates)
  const safeUpdates: Record<string, unknown> = {}
  for (const [k, v] of entries) {
    if (k === "folderId" && v === undefined) {
      safeUpdates[k] = deleteField()
      continue
    }
    if (v !== undefined) safeUpdates[k] = v as unknown
  }
  await updateDoc(ref, { ...safeUpdates, updatedAt: now })
}

export async function deleteNote(userId: string, noteId: string) {
  const ref = doc(db, "users", userId, "notes", noteId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data() as NoteData
    const urls: string[] = []
    const walk = (node: any) => {
      if (!node) return
      if (node.type === "image" && typeof node?.attrs?.src === "string") {
        urls.push(node.attrs.src as string)
      }
      if (Array.isArray(node?.content)) node.content.forEach(walk)
    }
    walk(data.content as any)
    await Promise.all(urls.map((u) => deleteImageFromStorage(u)))
  }
  await deleteDoc(ref)
}

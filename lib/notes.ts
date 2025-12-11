import { db } from "@/lib/firebase"
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
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
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as Partial<NoteData>
  await updateDoc(ref, { ...safeUpdates, updatedAt: now })
}

import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import type { CommentData } from "@/types"

export function subscribeComments(
  userId: string,
  noteId: string,
  onData: (comments: CommentData[]) => void
) {
  const ref = collection(db, "users", userId, "notes", noteId, "comments")
  return onSnapshot(ref, (snap) => {
    const comments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommentData, "id">) })) as CommentData[]
    onData(comments)
  })
}

export async function createComment(
  userId: string,
  noteId: string,
  data: { text: string; snippet: string; id?: string }
): Promise<CommentData> {
  const col = collection(db, "users", userId, "notes", noteId, "comments")
  const ref = data.id ? doc(col, data.id) : doc(col)
  const now = new Date().toISOString()
  const payload: CommentData = {
    id: ref.id,
    text: data.text,
    snippet: data.snippet,
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(ref, payload)
  return payload
}

export async function updateComment(
  userId: string,
  noteId: string,
  commentId: string,
  updates: Partial<CommentData>
) {
  const ref = doc(db, "users", userId, "notes", noteId, "comments", commentId)
  const now = new Date().toISOString()
  await updateDoc(ref, { ...updates, updatedAt: now })
}

export async function deleteComment(userId: string, noteId: string, commentId: string) {
  const ref = doc(db, "users", userId, "notes", noteId, "comments", commentId)
  await deleteDoc(ref)
}

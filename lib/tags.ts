import { db } from "@/lib/firebase"
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import type { TagData } from "@/types"

export async function createTag(userId: string, name: string, color?: string): Promise<TagData> {
  const now = new Date().toISOString()
  const col = collection(db, "users", userId, "tags")
  const ref = doc(col)
  const tag: TagData = {
    id: ref.id,
    name,
    ...(color !== undefined ? { color } : {}),
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(ref, tag)
  return tag
}

export function subscribeTags(userId: string, onData: (tags: TagData[]) => void) {
  const ref = collection(db, "users", userId, "tags")
  return onSnapshot(ref, (snap) => {
    const tags = snap.docs.map((d) => d.data() as TagData)
    onData(tags)
  })
}

export async function updateTag(userId: string, tagId: string, updates: Partial<TagData>) {
  const ref = doc(db, "users", userId, "tags", tagId)
  const now = new Date().toISOString()
  const safe = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)) as Partial<TagData>
  await updateDoc(ref, { ...safe, updatedAt: now })
}

export async function deleteTag(userId: string, tagId: string) {
  const ref = doc(db, "users", userId, "tags", tagId)
  await deleteDoc(ref)
}

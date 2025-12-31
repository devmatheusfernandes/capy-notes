import { db } from "@/lib/firebase"
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import type { TaskData } from "@/types"

export async function createTask(userId: string, overrides: Partial<TaskData> = {}): Promise<TaskData> {
  const now = new Date().toISOString()
  const tasksCol = collection(db, "users", userId, "tasks")
  const ref = doc(tasksCol)
  const task: TaskData = {
    id: ref.id,
    title: overrides.title ?? "Nova tarefa",
    status: overrides.status ?? "pending",
    createdAt: now,
    updatedAt: now,
    userId,
    ...overrides,
  }
  
  // Remove undefined values
  const cleanTask = Object.fromEntries(
    Object.entries(task).filter(([_, v]) => v !== undefined)
  )
  
  await setDoc(ref, cleanTask)
  return task
}

export async function getTask(userId: string, taskId: string): Promise<TaskData | null> {
  const ref = doc(db, "users", userId, "tasks", taskId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TaskData) : null
}

export function subscribeTasks(userId: string, onData: (tasks: TaskData[]) => void) {
  const ref = collection(db, "users", userId, "tasks")
  return onSnapshot(ref, (snap) => {
    const tasks = snap.docs.map((d) => d.data() as TaskData)
    onData(tasks)
  })
}

export async function updateTask(userId: string, taskId: string, updates: Partial<TaskData>) {
  const ref = doc(db, "users", userId, "tasks", taskId)
  const now = new Date().toISOString()
  
  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries({ ...updates, updatedAt: now }).filter(([_, v]) => v !== undefined)
  )
  
  await updateDoc(ref, cleanUpdates)
}

export async function deleteTask(userId: string, taskId: string) {
  const ref = doc(db, "users", userId, "tasks", taskId)
  await deleteDoc(ref)
}

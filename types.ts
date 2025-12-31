export interface TagData {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  color?: string
}

import type { Content } from "@tiptap/react"

export interface NoteData {
  id: string
  title: string
  content: Content
  tagIds?: string[]
  folderId?: string
  archived?: boolean
  trashed?: boolean
  pinned?: boolean
  createdAt: string
  updatedAt: string
  type?: "pdf" | "note"
  fileUrl?: string
  isLocked?: boolean
}

export interface CommentData {
  id: string
  text: string
  snippet: string
  createdAt: string
  updatedAt?: string
}

export interface FolderData {
  id: string
  name: string
  parentId?: string
  color?: string
  archived?: boolean
  trashed?: boolean
  createdAt: string
  updatedAt: string
  isLocked?: boolean
}

export interface BreadcrumbItem {
  id: string
  name: string
}

export type TaskStatus = "pending" | "in-progress" | "done"

export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface TaskData {
  id: string
  title: string
  comment?: string
  subTasks?: SubTask[]
  dueDate?: string // ISO date string YYYY-MM-DD
  dueTime?: string // HH:mm
  status: TaskStatus
  createdAt: string
  updatedAt: string
  userId: string
}

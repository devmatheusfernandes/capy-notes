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
}

export interface BreadcrumbItem {
  id: string
  name: string
}

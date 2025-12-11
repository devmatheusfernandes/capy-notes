"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import type { NoteData } from "@/types"
import { createNote, subscribeNote, subscribeNotes, updateNote } from "@/lib/notes"

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null))
    return () => unsub()
  }, [])
  return userId
}

export function useNote(noteId: string | undefined) {
  const userId = useCurrentUserId()
  const [note, setNote] = useState<NoteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !noteId) return
    setLoading(true)
    const unsub = subscribeNote(userId, noteId, (n) => {
      setNote(n)
      setLoading(false)
    })
    return () => unsub()
  }, [userId, noteId])

  const save = useCallback(
    async (updates: Partial<NoteData>) => {
      if (!userId || !noteId) return
      await updateNote(userId, noteId, updates)
    },
    [userId, noteId]
  )

  return { note, loading, save }
}

export function useCreateNote() {
  const userId = useCurrentUserId()
  const [loading, setLoading] = useState(false)
  const canCreate = useMemo(() => !!userId, [userId])

  const create = useCallback(
    async (overrides: Partial<NoteData> = {}) => {
      if (!userId) throw new Error("Usuário não autenticado")
      setLoading(true)
      try {
        const note = await createNote(userId, overrides)
        return note
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  return { create, loading, canCreate }
}

export function useNotes(filters?: { folderId?: string; archived?: boolean; search?: string }) {
  const userId = useCurrentUserId()
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    const unsub = subscribeNotes(userId, (n) => {
      setNotes(n)
      setLoading(false)
    })
    return () => unsub()
  }, [userId])

  const filtered = useMemo(() => {
    let result = notes
    if (filters?.archived !== undefined) {
      result = result.filter((n) => (filters.archived ? n.archived : !n.archived))
    }
    if (filters?.folderId) {
      result = result.filter((n) => n.folderId === filters.folderId)
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((n) =>
        (n.title || "").toLowerCase().includes(q) ||
        JSON.stringify(n.content || {}).toLowerCase().includes(q)
      )
    }
    return result
  }, [notes, filters?.archived, filters?.folderId, filters?.search])

  return { notes: filtered, loading }
}

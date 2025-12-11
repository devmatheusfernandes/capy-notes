"use client"

import { useParams } from "next/navigation"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { useNote } from "@/hooks/notes"

export default function Page() {
  const params = useParams()
  const noteId = typeof params?.noteId === "string" ? params.noteId : Array.isArray(params?.noteId) ? params?.noteId[0] : undefined
  const { note, save } = useNote(noteId)
  return <SimpleEditor content={note?.content} onChange={(c) => save({ content: c })} />
}

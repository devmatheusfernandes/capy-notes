"use client"

import { useParams } from "next/navigation"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { useNote } from "@/hooks/notes"
import { useCurrentUserId } from "@/hooks/notes"

export default function Page() {
  const params = useParams()
  const noteId = typeof params?.noteId === "string" ? params.noteId : Array.isArray(params?.noteId) ? params?.noteId[0] : undefined
  const { note, save } = useNote(noteId)
  const userId = useCurrentUserId()
  return (
    <SimpleEditor
      content={note?.content}
      onChange={(c) => save({ content: c })}
      userId={userId ?? undefined}
      noteId={noteId}
      title={note?.title}
      tagIds={note?.tagIds}
    />
  )
}

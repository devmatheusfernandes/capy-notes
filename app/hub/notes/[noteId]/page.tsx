"use client"

import { useParams } from "next/navigation"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { PdfViewer } from "@/components/notes/pdf-viewer"
import { useNote } from "@/hooks/notes"
import { useCurrentUserId } from "@/hooks/notes"

export default function Page() {
  const params = useParams()
  const noteId = typeof params?.noteId === "string" ? params.noteId : Array.isArray(params?.noteId) ? params?.noteId[0] : undefined
  const { note, save } = useNote(noteId)
  const userId = useCurrentUserId()

  // Check for PDF
  // @ts-ignore
  const isPdf = note?.type === "pdf" || note?.content?.content?.[0]?.type === "pdf"
  // @ts-ignore
  const pdfUrl = note?.fileUrl || (isPdf ? note?.content?.content?.[0]?.attrs?.src : undefined)

  if (isPdf && pdfUrl) {
    return <PdfViewer src={pdfUrl} title={note?.title || "PDF"} />
  }

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

"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PdfViewerProps {
  src: string
  title: string
}

export function PdfViewer({ src, title }: PdfViewerProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header Minimalista */}
      <div className="flex items-center gap-2 border-b px-3 h-12 shrink-0 bg-background z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="shrink-0 h-8 w-8"
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-medium truncate flex-1">{title}</h1>
      </div>

      {/* Visualizador PDF Clean */}
      <div className="flex-1 w-full relative bg-zinc-100 dark:bg-zinc-900">
        <iframe
          src={`${src}#toolbar=0&navpanes=0`}
          className="absolute inset-0 w-full h-full border-none block"
          title={title}
        />
      </div>
    </div>
  )
}

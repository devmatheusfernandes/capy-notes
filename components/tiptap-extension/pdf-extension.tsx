
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { FileText } from 'lucide-react'

export interface PdfOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pdf: {
      setPdf: (options: { src: string; title?: string }) => ReturnType
    }
  }
}

const PdfComponent = ({ node, getPos }: any) => {
  return (
    <NodeViewWrapper className="pdf-component my-4">
      <div className="border rounded-lg overflow-hidden shadow-sm bg-background">
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{node.attrs.title || "Documento PDF"}</span>
        </div>
        <div className="relative w-full h-[600px] bg-muted/10">
            <iframe 
                src={node.attrs.src} 
                className="absolute inset-0 w-full h-full border-none" 
                title={node.attrs.title || "PDF Viewer"}
            />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const PdfExtension = Node.create<PdfOptions>({
  name: 'pdf',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pdf"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'pdf' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfComponent)
  },

  addCommands() {
    return {
      setPdf:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})

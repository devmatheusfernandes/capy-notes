import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { normalizeBookToken } from '@/lib/bible-abbreviations-pt'

export const BibleReferenceExtension = Extension.create({
  name: 'bibleReference',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bible-reference-autolink'),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanges = transactions.some(transaction => transaction.docChanged)
          if (!docChanges) return

          const { tr } = newState
          let modified = false

          // Regex baseada na sua lógica original do Lexical/Utils
          // Procura por grupos entre parênteses
          const regex = /\(([^)]+)\)/g
          
          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return

            const text = node.text
            // Reset regex state for each node
            regex.lastIndex = 0

            const validRanges: { from: number; to: number }[] = []
            let match

            while ((match = regex.exec(text)) !== null) {
              const fullMatch = match[0] // ex: (Gn 1:1)
              const innerContent = match[1] // ex: Gn 1:1
              
              // Validação rápida (igual ao seu utilitário)
              const chunks = innerContent.split(/\s*;\s*/).filter(Boolean)
              let isValidBibleRef = false

              for (const chunk of chunks) {
                // Regex simplificada para capturar o livro e validar
                const m = chunk.match(/^\s*((?:[1-3]\s*)?[A-Za-zçÇáÁéÉíÍóÓúÚâÂêÊôÔãÃõÕüÜ\.]+)\s+(\d+)/i)
                if (m) {
                  const normalized = normalizeBookToken(m[1])
                  if (normalized) {
                    isValidBibleRef = true
                    break 
                  }
                }
              }

              if (isValidBibleRef) {
                const from = pos + match.index
                const to = from + fullMatch.length
                validRanges.push({ from, to })
              }
            }

            // Check for existing links
            const bibleLinkMark = node.marks.find(m => m.type.name === 'link' && m.attrs.href === '#bible')
            const otherLinkMark = node.marks.find(m => m.type.name === 'link' && m.attrs.href !== '#bible')

            // If there's a user link, ignore this node (don't mess with user links)
            if (otherLinkMark) return

            if (bibleLinkMark) {
              // Check if the current node is EXACTLY one of the valid ranges (and only one)
              // Since text nodes are often split by marks, a fully linked node should match exactly one valid range 
              // that covers the entire node text.
              
              const nodeStart = pos
              const nodeEnd = pos + node.nodeSize
              
              const isFullyCovered = validRanges.length === 1 && 
                                     validRanges[0].from === nodeStart && 
                                     validRanges[0].to === nodeEnd

              if (!isFullyCovered) {
                // The link is incorrect (covers too much, or invalid text). 
                // Remove it from the whole node.
                tr.removeMark(nodeStart, nodeEnd, newState.schema.marks.link)
                
                // Re-add correct links
                validRanges.forEach(range => {
                   tr.addMark(
                    range.from,
                    range.to,
                    newState.schema.marks.link.create({ 
                      href: '#bible',
                      class: 'bible-ref-link text-blue-600 underline decoration-dotted cursor-pointer'
                    })
                  )
                })
                modified = true
              }
            } else {
              // No bible link, but maybe we should add one?
              if (validRanges.length > 0) {
                 validRanges.forEach(range => {
                   tr.addMark(
                    range.from,
                    range.to,
                    newState.schema.marks.link.create({ 
                      href: '#bible',
                      class: 'bible-ref-link text-blue-600 underline decoration-dotted cursor-pointer'
                    })
                  )
                })
                modified = true
              }
            }
          })

          if (modified) return tr
        },
      }),
    ]
  },
})

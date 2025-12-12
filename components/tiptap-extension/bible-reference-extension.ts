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

            // Se já tem link, ignorar para não duplicar/quebrar
            const hasLink = node.marks.some(m => m.type.name === 'link')
            if (hasLink) return

            const text = node.text
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
                
                // Adiciona o mark de Link com #bible
                tr.addMark(
                  from,
                  to,
                  newState.schema.marks.link.create({ 
                    href: '#bible',
                    class: 'bible-ref-link text-blue-600 underline decoration-dotted cursor-pointer' // Estilização opcional
                  })
                )
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
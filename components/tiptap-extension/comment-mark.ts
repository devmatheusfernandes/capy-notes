import { Mark, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attrs: { id: string }) => ReturnType
      unsetComment: () => ReturnType
      toggleComment: (attrs: { id: string }) => ReturnType
    }
  }
}

export const CommentMark = Mark.create({
  name: "comment",

  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attrs) => {
          if (!attrs.id) return {}
          return { "data-comment-id": attrs.id }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span[data-comment-id]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "tiptap-comment" }),
      0,
    ]
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ chain }) =>
          chain().setMark(this.name, attrs).run(),
      unsetComment:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
      toggleComment:
        (attrs) =>
        ({ chain }) =>
          chain().toggleMark(this.name, attrs).run(),
    }
  },
})

export default CommentMark

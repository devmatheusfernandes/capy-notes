import type { LucideIcon } from "lucide-react"
import { Home, FileText, Star, Archive, Trash2, User, Settings, Clock, BookOpen, NotebookPen } from "lucide-react"

export type HubNavItem = {
  title: string
  href?: string
  icon: LucideIcon
  children?: HubNavItem[]
}

export const hubNav: HubNavItem[] = [
  { title: "Início", href: "/hub", icon: Home },
  { title: "Perfil", href: "/hub/profile", icon: User },
  {
    title: "Notas",
    icon: FileText,
    children: [
      { title: "Notas", href: "/hub/notes", icon: FileText },
      { title: "Favoritos", href: "/hub/favorites", icon: Star },
      { title: "Arquivadas", href: "/hub/archived", icon: Archive },
      { title: "Lixeira", href: "/hub/trash", icon: Trash2 },
    ],
  },
  {
    title: "Espiritual",
    icon: BookOpen,
    children: [
      { title: "Bíblia", href: "/hub/spiritual/bible", icon: BookOpen },
      { title: "Estudo pessoal", href: "/hub/spiritual/study", icon: NotebookPen },
    ],
  },
  { title: "Tarefas", href: "/hub/tasks", icon: Clock },

  { title: "Configurações", href: "/hub/settings", icon: Settings },
]

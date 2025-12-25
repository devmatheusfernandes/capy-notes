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
{ title: "Notas", href: "/hub/notes", icon: FileText },
  {
    title: "Espiritual",
    icon: BookOpen,
    children: [
      { title: "Bíblia", href: "/hub/spiritual/bible", icon: BookOpen },
      { title: "Dicionário", href: "/hub/spiritual/dicionario", icon: BookOpen },
      { title: "Estudo pessoal", href: "/hub/spiritual/personal-study", icon: NotebookPen },
      { title: "Preferências", href: "/hub/spiritual/preferencias", icon: Settings },
    ],
  },
  { title: "Tarefas", href: "/hub/tasks", icon: Clock },

  { title: "Configurações", href: "/hub/settings", icon: Settings },
]

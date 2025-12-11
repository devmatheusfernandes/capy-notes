import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
    <SidebarInset>
      <AppSidebar />
      <aside>
        {children}
      </aside>
      </SidebarInset>
    </SidebarProvider>
  )
}
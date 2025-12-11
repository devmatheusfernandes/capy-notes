import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar side="right" collapsible="offcanvas" variant="inset">
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
    </Sidebar>
  )
}
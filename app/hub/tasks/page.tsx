"use client"

import { useState } from "react"
import { useTasks } from "@/hooks/useTasks"
import { TaskListView } from "@/components/tasks/task-list-view"
import { TaskKanbanView } from "@/components/tasks/task-kanban-view"
import { TaskWeekView } from "@/components/tasks/task-week-view"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, List, Kanban, Calendar } from "lucide-react"
import { TaskData } from "@/types"
import { Spinner } from "@/components/ui/spinner"

export default function TasksPage() {
  const { tasks, loading, create, update, remove } = useTasks()
  const [view, setView] = useState<"list" | "kanban" | "week">("list")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskData | undefined>(undefined)

  const handleCreate = () => {
    setEditingTask(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (task: TaskData) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleSave = async (data: Partial<TaskData>) => {
    if (editingTask) {
      await update(editingTask.id, data)
    } else {
      await create(data)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas atividades diárias.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="list" title="Lista">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban" title="Kanban">
                <Kanban className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="week" title="Semana">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {view === "list" && (
          <div className="h-full overflow-y-auto pr-2">
            <TaskListView 
              tasks={tasks} 
              onTaskClick={handleEdit} 
              onStatusChange={(id, status) => update(id, { status })}
              onTaskUpdate={(id, data) => update(id, data)}
            />
          </div>
        )}
        {view === "kanban" && (
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <TaskKanbanView 
              tasks={tasks} 
              onTaskClick={handleEdit} 
              onStatusChange={(id, status) => update(id, { status })}
              onTaskUpdate={(id, data) => update(id, data)}
            />
          </div>
        )}
        {view === "week" && (
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <TaskWeekView 
              tasks={tasks} 
              onTaskClick={handleEdit} 
              onDateChange={(id, date) => update(id, { dueDate: date })}
              onTaskUpdate={(id, data) => update(id, data)}
            />
          </div>
        )}
      </div>

      <TaskDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        task={editingTask} 
        onSave={handleSave}
        onDelete={remove}
      />
    </div>
  )
}

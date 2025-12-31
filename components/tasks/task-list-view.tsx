"use client"

import { TaskData, TaskStatus } from "@/types"
import { TaskCard } from "./task-card"
import { Checkbox } from "@/components/ui/checkbox"

interface TaskListViewProps {
  tasks: TaskData[]
  onTaskClick: (task: TaskData) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
}

export function TaskListView({ tasks, onTaskClick, onStatusChange, onTaskUpdate }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>Nenhuma tarefa encontrada.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="w-full">
            <TaskCard 
              task={task} 
              onClick={() => onTaskClick(task)}
              className="hover:bg-accent/50"
              showCheckbox={true}
              onStatusChange={(status) => onStatusChange(task.id, status)}
              onTaskUpdate={onTaskUpdate}
            />
          </div>
        ))}
      </div>
  )
}

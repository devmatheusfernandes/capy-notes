"use client"

import { useMemo, useState } from "react"
import { TaskData, TaskStatus } from "@/types"
import { TaskCard } from "./task-card"
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { createPortal } from "react-dom"

interface TaskKanbanViewProps {
  tasks: TaskData[]
  onTaskClick: (task: TaskData) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "pending", title: "Pendente" },
  { id: "in-progress", title: "Em Progresso" },
  { id: "done", title: "Concluído" },
]

export function TaskKanbanView({ tasks, onTaskClick, onStatusChange, onTaskUpdate }: TaskKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const columns = useMemo(() => {
    const cols: Record<TaskStatus, TaskData[]> = {
      pending: [],
      "in-progress": [],
      done: [],
    }
    tasks.forEach((t) => {
      if (cols[t.status]) {
        cols[t.status].push(t)
      }
    })
    return cols
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string // Can be a task ID or a column ID

    // Find the task
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // If dropped on a column container
    if (COLUMNS.some(c => c.id === overId)) {
      if (task.status !== overId) {
        onStatusChange(taskId, overId as TaskStatus)
      }
      return
    }

    // If dropped on another task, find that task's column
    const overTask = tasks.find(t => t.id === overId)
    if (overTask && overTask.status !== task.status) {
      onStatusChange(taskId, overTask.status)
    }
  }

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex w-full h-full gap-4 pb-4 flex-col md:flex-row overflow-y-auto md:overflow-y-hidden md:overflow-x-auto">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={columns[col.id]}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
            onTaskUpdate={onTaskUpdate}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isOverlay className="w-[300px]" />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}

interface KanbanColumnProps { 
  id: TaskStatus
  title: string
  tasks: TaskData[]
  onTaskClick: (t: TaskData) => void
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
}

function KanbanColumn({ id, title, tasks, onTaskClick, onStatusChange, onTaskUpdate }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  })

  const colIndex = COLUMNS.findIndex(c => c.id === id)
  
  return (
    <div ref={setNodeRef} className="flex flex-col rounded-lg bg-muted/50 p-4 shrink-0 md:h-full md:min-w-[320px] md:w-[32%] w-full h-auto">
      <h3 className="mb-4 font-semibold text-sm text-muted-foreground uppercase">{title} ({tasks.length})</h3>
      <div className="flex-1 space-y-3 md:overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onMoveUp={colIndex > 0 && onStatusChange ? () => onStatusChange(task.id, COLUMNS[colIndex - 1].id) : undefined}
              onMoveDown={colIndex < COLUMNS.length - 1 && onStatusChange ? () => onStatusChange(task.id, COLUMNS[colIndex + 1].id) : undefined}
              onTaskUpdate={onTaskUpdate}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function DraggableTaskCard({ task, onClick, onMoveUp, onMoveDown, onTaskUpdate }: { task: TaskData; onClick: () => void; onMoveUp?: () => void; onMoveDown?: () => void; onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none" as React.CSSProperties["touchAction"], // Prevent scrolling while dragging
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        onClick={onClick}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onTaskUpdate={onTaskUpdate}
      />
    </div>
  )
}

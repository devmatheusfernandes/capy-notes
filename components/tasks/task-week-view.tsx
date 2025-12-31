"use client"

import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameDay 
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  DndContext, 
  DragOverlay, 
  DragEndEvent, 
  DragStartEvent, 
  MouseSensor,
  TouchSensor,
  useSensor, 
  useSensors, 
  useDroppable,
  closestCorners
} from "@dnd-kit/core"
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

import { TaskData } from "@/types"
import { TaskCard } from "./task-card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TaskWeekViewProps {
  tasks: TaskData[]
  onTaskClick: (task: TaskData) => void
  onDateChange: (taskId: string, date: string) => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
}

interface DayColumnProps {
  dateStr: string
  label: string
  dayNum: string
  isToday: boolean
  tasks: TaskData[]
  onTaskClick: (t: TaskData) => void
  onDateChange?: (taskId: string, date: string) => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
  prevDate?: string
  nextDate?: string
}

export function TaskWeekView({ tasks, onTaskClick, onDateChange, onTaskUpdate }: TaskWeekViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mobilePage, setMobilePage] = useState(0) 
  const [weekOffset, setWeekOffset] = useState(0)
  
  const today = useMemo(() => new Date(), [])

  const start = useMemo(() => {
    const s = startOfWeek(today, { weekStartsOn: 0 })
    return addDays(s, weekOffset * 7)
  }, [weekOffset, today])
  
  // SOLUÇÃO 1: Geramos 8 dias em vez de 7.
  // Isso garante que no mobile, o Sábado (índice 6) tenha o Domingo seguinte (índice 7) como par.
  const days = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const date = addDays(start, i)
      return {
        date,
        dateStr: format(date, "yyyy-MM-dd"),
        label: format(date, "EEEE", { locale: ptBR }),
        dayNum: format(date, "d"),
      }
    })
  }, [start])

  // Desktop vê apenas a semana atual (0 a 6)
  const desktopDays = useMemo(() => days.slice(0, 7), [days])

  // Mobile navega pelos 8 dias
  const mobileVisibleDays = useMemo(() => {
    const startIdx = mobilePage * 2
    return days.slice(startIdx, startIdx + 2)
  }, [days, mobilePage])

  // SOLUÇÃO 2: Sensores separados para Mouse e Touch
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // No mouse, arrasta ao mover 8px
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // No mobile, precisa SEGURAR por 250ms para arrastar (evita conflito com scroll)
        tolerance: 5,
      },
    })
  )

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskData[]> = {}
    days.forEach(d => map[d.dateStr] = [])
    
    tasks.forEach(t => {
      const dateToUse = t.dueDate || t.createdAt?.split('T')[0]
      if (dateToUse && map[dateToUse]) {
        map[dateToUse].push(t)
      }
    })
    return map
  }, [tasks, days])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Verifica se soltou na Coluna (Data)
    const isOverColumn = days.some(d => d.dateStr === overId)
    if (isOverColumn) {
      const task = tasks.find(t => t.id === taskId)
      if (task && task.dueDate !== overId) {
        onDateChange(taskId, overId)
      }
      return
    }

    // Verifica se soltou sobre outra Tarefa
    const overTask = tasks.find(t => t.id === overId)
    if (overTask && overTask.dueDate) {
       const activeTask = tasks.find(t => t.id === taskId)
       if (activeTask && activeTask.dueDate !== overTask.dueDate) {
         onDateChange(taskId, overTask.dueDate)
       }
    }
  }

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* --- Controles de Navegação --- */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              if (window.innerWidth < 768) {
                if (mobilePage > 0) setMobilePage(p => p - 1)
                else { setWeekOffset(w => w - 1); setMobilePage(3); }
              } else {
                setWeekOffset(w => w - 1)
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center min-w-[140px]">
             <span className="text-sm font-semibold capitalize">
               {format(days[0].date, "MMMM yyyy", { locale: ptBR })}
             </span>
             <span className="text-xs text-muted-foreground hidden md:inline-block">
               {/* Desktop Label */}
               {format(days[0].date, "d", { locale: ptBR })} - {format(days[6].date, "d", { locale: ptBR })}
             </span>
             <span className="text-xs text-muted-foreground md:hidden">
                {/* Mobile Label */}
                {mobileVisibleDays.length > 0 && (
                   <>{mobileVisibleDays[0].dayNum} - {mobileVisibleDays[mobileVisibleDays.length - 1].dayNum}</>
                )}
             </span>
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
               if (window.innerWidth < 768) {
                if (mobilePage < 3) setMobilePage(p => p + 1)
                else { setWeekOffset(w => w + 1); setMobilePage(0); }
               } else {
                 setWeekOffset(w => w + 1)
               }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => { 
            setWeekOffset(0)
            setMobilePage(Math.floor(today.getDay() / 2))
          }} 
          className="gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Hoje
        </Button>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0">
          
          {/* Mobile Grid (Usa mobileVisibleDays) */}
          <div className="grid md:hidden grid-cols-2 gap-3 h-full pb-2">
            {mobileVisibleDays.map((day, idx) => (
              <DayColumn
                key={day.dateStr}
                {...day}
                isToday={isSameDay(day.date, today)}
                tasks={tasksByDate[day.dateStr]}
                onTaskClick={onTaskClick}
                onDateChange={onDateChange}
                onTaskUpdate={onTaskUpdate}
                // Lógica para setas de mover tarefa individualmente
                prevDate={idx > 0 ? mobileVisibleDays[idx - 1].dateStr : undefined}
                nextDate={idx < mobileVisibleDays.length - 1 ? mobileVisibleDays[idx + 1].dateStr : undefined}
              />
            ))}
          </div>

          {/* Desktop Grid (Usa desktopDays - apenas 7) */}
          <div className="hidden md:grid grid-cols-7 gap-3 h-full min-w-[1000px] pb-2">
            {desktopDays.map((day, idx) => (
              <DayColumn
                key={day.dateStr}
                {...day}
                isToday={isSameDay(day.date, today)}
                tasks={tasksByDate[day.dateStr]}
                onTaskClick={onTaskClick}
                onDateChange={onDateChange}
                onTaskUpdate={onTaskUpdate}
                prevDate={idx > 0 ? desktopDays[idx - 1].dateStr : undefined}
                nextDate={idx < desktopDays.length - 1 ? desktopDays[idx + 1].dateStr : undefined}
              />
            ))}
          </div>
        </div>

        {createPortal(
          <DragOverlay>
            {activeTask ? (
              <TaskCard 
                task={activeTask} 
                isOverlay 
                className="w-[200px] opacity-90 shadow-xl cursor-grabbing" 
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  )
}

function DayColumn({ dateStr, label, dayNum, isToday, tasks, onTaskClick, onDateChange, prevDate, nextDate, onTaskUpdate }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
  })

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex flex-col h-full rounded-xl border bg-card/50 transition-colors",
        isToday ? "border-primary/50 bg-primary/5" : "border-border",
        isOver && "bg-accent/50 border-primary ring-2 ring-primary/20"
      )}
    >
      <div className={cn("p-3 text-center border-b", isToday && "border-primary/20")}>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn("mt-1 text-2xl font-bold tracking-tight", isToday ? "text-primary" : "text-foreground")}>{dayNum}</div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)}
                onMoveLeft={prevDate && onDateChange ? () => onDateChange(task.id, prevDate) : undefined}
                onMoveRight={nextDate && onDateChange ? () => onDateChange(task.id, nextDate) : undefined}
                onTaskUpdate={onTaskUpdate}
              />
            ))
          ) : (
            // Área vazia clicável e "droppable"
            <div className="h-full min-h-[100px] w-full border-2 border-dashed border-muted rounded-lg flex items-center justify-center opacity-50 select-none">
              <span className="text-xs text-muted-foreground">Vazio</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

function DraggableTaskCard({ task, onClick, onMoveLeft, onMoveRight, onTaskUpdate }: { task: TaskData; onClick: () => void; onMoveLeft?: () => void; onMoveRight?: () => void; onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    // Translate previne distorção visual
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    // CRÍTICO PARA MOBILE: impede que o toque seja capturado como scroll
    touchAction: "none" as React.CSSProperties["touchAction"], 
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("touch-none", isDragging && "z-50")}>
      <TaskCard
        task={task}
        onClick={onClick}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
        onTaskUpdate={onTaskUpdate}
        className="text-xs cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
      />
    </div>
  )
}
"use client"

import { TaskData } from "@/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckSquare, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface TaskCardProps {
  task: TaskData
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  innerRef?: React.Ref<HTMLDivElement>
  attributes?: any
  listeners?: any
  isOverlay?: boolean
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  showCheckbox?: boolean
  onStatusChange?: (status: "done" | "pending") => void
  onTaskUpdate?: (taskId: string, data: Partial<TaskData>) => void
}

export function TaskCard({ 
  task, 
  onClick, 
  className, 
  style, 
  innerRef, 
  attributes, 
  listeners, 
  isOverlay, 
  onMoveLeft, 
  onMoveRight,
  onMoveUp,
  onMoveDown,
  showCheckbox,
  onStatusChange,
  onTaskUpdate
}: TaskCardProps) {
  const completedSubtasks = task.subTasks?.filter(st => st.completed).length || 0
  const totalSubtasks = task.subTasks?.length || 0
  
  const displayDate = task.dueDate || task.createdAt

  const handleSubTaskToggle = (subTaskId: string, checked: boolean) => {
    if (!onTaskUpdate) return
    const newSubTasks = task.subTasks?.map(st => 
      st.id === subTaskId ? { ...st, completed: checked } : st
    )
    onTaskUpdate(task.id, { subTasks: newSubTasks })
  }

  return (
    <Card 
      ref={innerRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-pointer hover:border-primary/50 transition-colors relative group",
        isOverlay ? "shadow-xl rotate-2 cursor-grabbing z-50 bg-background" : "",
        task.status === "done" ? "opacity-70 bg-muted/50" : "",
        className
      )}
      onClick={onClick}
    >
      {onMoveUp && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-1/2 -translate-x-1/2 top-0 w-8 h-6 rounded-none rounded-b-lg md:hidden z-10 hover:bg-accent/50"
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
      {onMoveDown && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-8 h-6 rounded-none rounded-t-lg md:hidden z-10 hover:bg-accent/50"
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}

      {onMoveLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-8 rounded-none rounded-l-lg md:hidden z-10 hover:bg-accent/50"
          onClick={(e) => {
            e.stopPropagation()
            onMoveLeft()
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {onMoveRight && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-8 rounded-none rounded-r-lg md:hidden z-10 hover:bg-accent/50"
          onClick={(e) => {
            e.stopPropagation()
            onMoveRight()
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      <CardContent className={cn(
        "p-3 space-y-2", 
        (onMoveLeft || onMoveRight) && "px-8 md:px-3",
        (onMoveUp || onMoveDown) && "py-6 md:py-3"
      )}>
        <div className="flex gap-3">
          {showCheckbox && (
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox 
                checked={task.status === "done"}
                onCheckedChange={(checked) => {
                  onStatusChange?.(checked ? "done" : "pending")
                }}
              />
            </div>
          )}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className={cn("font-medium text-sm line-clamp-2", task.status === "done" && "line-through text-muted-foreground")}>
                {task.title}
              </span>
              <Badge variant={task.status === "done" ? "secondary" : task.status === "in-progress" ? "default" : "outline"} className="text-[10px] h-5 px-1.5 shrink-0">
                {task.status === "done" ? "Feito" : task.status === "in-progress" ? "Fazendo" : "Pendente"}
              </Badge>
            </div>
            
            {(displayDate || task.subTasks?.length) ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {displayDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(parseISO(displayDate), 'dd/MM', { locale: ptBR })}</span>
                      {task.dueTime && (
                        <>
                          <Clock className="h-3 w-3 ml-1" />
                          <span>{task.dueTime}</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {totalSubtasks > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      <span>{completedSubtasks}/{totalSubtasks}</span>
                    </div>
                  )}
                </div>

                {task.subTasks && task.subTasks.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {task.subTasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group/subtask" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          id={`st-${st.id}`}
                          checked={st.completed} 
                          onCheckedChange={(checked) => handleSubTaskToggle(st.id, checked as boolean)}
                          className="h-3 w-3"
                        />
                        <label 
                          htmlFor={`st-${st.id}`}
                          className={cn(
                            "text-xs cursor-pointer select-none", 
                            st.completed ? "line-through text-muted-foreground" : ""
                          )}
                        >
                          {st.title}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

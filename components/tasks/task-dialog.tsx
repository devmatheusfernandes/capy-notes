"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskData, TaskStatus, SubTask } from "@/types"
import { Plus, X, Trash2 } from "lucide-react"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: TaskData
  onSave: (task: Partial<TaskData>) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
}

export function TaskDialog({ open, onOpenChange, task, onSave, onDelete }: TaskDialogProps) {
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [status, setStatus] = useState<TaskStatus>("pending")
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("")
  const [subTasks, setSubTasks] = useState<SubTask[]>([])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setComment(task.comment || "")
      setStatus(task.status)
      setDueDate(task.dueDate || "")
      setDueTime(task.dueTime || "")
      setSubTasks(task.subTasks || [])
    } else {
      setTitle("")
      setComment("")
      setStatus("pending")
      setDueDate("")
      setDueTime("")
      setSubTasks([])
    }
  }, [task, open])

  const handleSave = async () => {
    if (!title.trim()) return
    await onSave({
      title,
      comment,
      status,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      subTasks,
    })
    onOpenChange(false)
  }

  const addSubTask = () => {
    setSubTasks([...subTasks, { id: crypto.randomUUID(), title: "", completed: false }])
  }

  const updateSubTask = (id: string, updates: Partial<SubTask>) => {
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, ...updates } : st))
  }

  const removeSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="O que precisa ser feito?"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in-progress">Em Progresso</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input 
                type="time" 
                value={dueTime} 
                onChange={(e) => setDueTime(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comentário</Label>
            <Textarea 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subtarefas</Label>
              <Button variant="ghost" size="sm" onClick={addSubTask}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {subTasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2">
                  <Input 
                    type="checkbox" 
                    className="h-4 w-4"
                    checked={st.completed}
                    onChange={(e) => updateSubTask(st.id, { completed: e.target.checked })}
                  />
                  <Input 
                    value={st.title} 
                    onChange={(e) => updateSubTask(st.id, { title: e.target.value })}
                    placeholder="Subtarefa..."
                    className="flex-1 h-8 text-sm"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSubTask(st.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {task && onDelete ? (
             <Button variant="destructive" onClick={() => {
               onDelete(task.id)
               onOpenChange(false)
             }}>
               <Trash2 className="h-4 w-4 mr-2" /> Excluir
             </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

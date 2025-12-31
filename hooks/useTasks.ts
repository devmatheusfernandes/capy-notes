"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useCurrentUserId } from "@/hooks/notes"
import { TaskData } from "@/types"
import { createTask, subscribeTasks, updateTask, deleteTask } from "@/lib/tasks"

export function useTasks() {
  const userId = useCurrentUserId()
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeTasks(userId, (t) => {
      setTasks(t)
      setLoading(false)
    })
    return () => unsub()
  }, [userId])

  const create = useCallback(
    async (overrides: Partial<TaskData> = {}) => {
      if (!userId) throw new Error("User not authenticated")
      return createTask(userId, overrides)
    },
    [userId]
  )

  const update = useCallback(
    async (taskId: string, updates: Partial<TaskData>) => {
      if (!userId) return
      await updateTask(userId, taskId, updates)
    },
    [userId]
  )

  const remove = useCallback(
    async (taskId: string) => {
      if (!userId) return
      await deleteTask(userId, taskId)
    },
    [userId]
  )

  return { tasks, loading, create, update, remove }
}

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { validateUserPin } from "@/lib/user-settings"
import { useCurrentUserId } from "@/hooks/notes"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  onSuccess: () => void
}

export function PinDialog({
  open,
  onOpenChange,
  title = "Digite seu PIN",
  description = "Esta nota está protegida.",
  onSuccess,
}: PinDialogProps) {
  const userId = useCurrentUserId()
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      const isValid = await validateUserPin(userId, pin)
      if (isValid) {
        onSuccess()
        onOpenChange(false)
        setPin("")
      } else {
        toast.error("PIN incorreto")
        setPin("")
      }
    } catch (error) {
      toast.error("Erro ao validar PIN")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

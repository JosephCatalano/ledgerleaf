"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type DeleteDialogProps = {
  open: boolean
  onClose: () => void
  transactionId: string | null
}

export function DeleteTransactionDialog({
  open,
  onClose,
  transactionId,
}: DeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete transaction")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      onClose()
    },
  })

  const handleDelete = () => {
    if (transactionId) {
      deleteMutation.mutate(transactionId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

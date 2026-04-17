"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteSession } from "@/app/actions/training";
import { Trash2 } from "lucide-react";

type DialogProps = {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  deleteRedirectTo?: string;
};

export function HistoryDeleteSessionDialog({
  sessionId,
  open,
  onOpenChange,
  onDeleted,
  deleteRedirectTo,
}: DialogProps) {
  const router = useRouter();
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setDeleteErr(null);
  }, [open, sessionId]);

  const runDelete = () => {
    if (!sessionId) return;
    setDeleteErr(null);
    startTransition(async () => {
      const r = await deleteSession(sessionId);
      if (r && "error" in r && r.error) {
        setDeleteErr(r.error);
        return;
      }
      onOpenChange(false);
      onDeleted?.();
      if (deleteRedirectTo) router.push(deleteRedirectTo);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center sm:text-left">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-balance">
            Are you sure you want to delete this workout?
          </DialogTitle>
          <DialogDescription className="text-balance pt-1">
            This removes the session and every logged set. You can&apos;t undo this.
          </DialogDescription>
        </DialogHeader>
        {deleteErr ? <p className="text-sm text-destructive">{deleteErr}</p> : null}
        <DialogFooter className="w-full flex-col gap-2 sm:flex-col sm:justify-center">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => void runDelete()}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Icon trigger for history table rows (opens parent-controlled dialog). */
export function HistorySessionDeleteIcon({ onPress }: { onPress: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
      aria-label="Delete workout"
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

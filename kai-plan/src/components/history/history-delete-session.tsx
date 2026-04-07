"use client";

import { useState, useTransition } from "react";
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

type Props = {
  sessionId: string;
  /** After successful delete (e.g. collapse History row). */
  onDeleted?: () => void;
  /** Navigate after delete (e.g. `/history` on session detail). */
  deleteRedirectTo?: string;
  /** Icon-only for table rows; full labeled button for session page. */
  variant?: "icon" | "button";
};

export function HistoryDeleteSession({
  sessionId,
  onDeleted,
  deleteRedirectTo,
  variant = "icon",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runDelete = () => {
    setDeleteErr(null);
    startTransition(async () => {
      const r = await deleteSession(sessionId);
      if (r && "error" in r && r.error) {
        setDeleteErr(r.error);
        return;
      }
      setOpen(false);
      onDeleted?.();
      if (deleteRedirectTo) router.push(deleteRedirectTo);
      router.refresh();
    });
  };

  const trigger =
    variant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        aria-label="Delete workout"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteErr(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 border-destructive/40 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setDeleteErr(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete workout
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-center sm:text-left">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-balance">
              Are you sure you want to delete this workout?
            </DialogTitle>
            <DialogDescription className="text-balance pt-1">
              This removes the session and every logged set. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          {deleteErr ? (
            <p className="text-sm text-destructive">{deleteErr}</p>
          ) : null}
          <DialogFooter className="w-full flex-col gap-2 sm:flex-col sm:justify-center">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={() => setOpen(false)}
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
    </>
  );
}

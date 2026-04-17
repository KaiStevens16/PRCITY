"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HistoryDeleteSessionDialog } from "@/components/history/history-delete-session-dialog";
import { Trash2 } from "lucide-react";

type Props = {
  sessionId: string;
  /** After successful delete (e.g. collapse History row). */
  onDeleted?: () => void;
  /** Navigate after delete (e.g. `/history` on session detail). */
  deleteRedirectTo?: string;
};

/** Labeled delete control + dialog for the session detail page. */
export function HistoryDeleteSession({ sessionId, onDeleted, deleteRedirectTo }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 border-destructive/40 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete workout
      </Button>
      <HistoryDeleteSessionDialog
        sessionId={sessionId}
        open={open}
        onOpenChange={setOpen}
        onDeleted={onDeleted}
        deleteRedirectTo={deleteRedirectTo}
      />
    </>
  );
}

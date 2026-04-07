"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudAlert } from "lucide-react";
import { updateSessionFields } from "@/app/actions/training";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  sessionId: string;
  /** Only completed (or skipped) sessions — editing in-progress stays on Today */
  editable: boolean;
  weirdDay: boolean;
  weirdDayNotes: string | null;
};

export function SessionWeirdDayControls({
  sessionId,
  editable,
  weirdDay: initialWeird,
  weirdDayNotes: initialNotes,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes, initialWeird]);

  if (!editable) return null;

  async function saveWeird() {
    await updateSessionFields({
      sessionId,
      weirdDay: true,
      weirdDayNotes: notes.trim() || null,
    });
    setOpen(false);
    router.refresh();
  }

  async function clearWeird() {
    await updateSessionFields({
      sessionId,
      weirdDay: false,
      weirdDayNotes: null,
    });
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={initialWeird ? "secondary" : "outline"}
        className={
          initialWeird
            ? "gap-1.5 border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
            : "gap-1.5 border-border/60"
        }
        onClick={() => setOpen(true)}
      >
        <CloudAlert className="h-4 w-4" />
        {initialWeird ? "Edit weird day" : "Mark weird day"}
      </Button>
      {initialWeird && (
        <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={clearWeird}>
          Set to normal day
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/80 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CloudAlert className="h-5 w-5 text-amber-400" />
              Weird day
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This session will show <span className="text-amber-200/90">amber</span> on the command center
            instead of <span className="text-emerald-200/90">green</span>.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? (injury, cut short, travel, etc.)"
            className="min-h-[100px] resize-y border-border/60 bg-background/50 text-sm"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={clearWeird}>
              Clear — normal day
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={() => void saveWeird()}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

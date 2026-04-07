"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSessionExercise } from "@/app/actions/training";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionExerciseId: string;
  plannedName: string;
  currentActual: string;
};

export function SubstitutionModal({
  open,
  onOpenChange,
  sessionExerciseId,
  plannedName,
  currentActual,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(currentActual);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setName(currentActual);
      setReason("");
    }
  }, [open, currentActual]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const isSub = trimmed !== plannedName;
    await updateSessionExercise({
      id: sessionExerciseId,
      actualExerciseName: trimmed,
      isSubstitution: isSub,
      substitutionReason: isSub ? reason.trim() || null : null,
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Substitution</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Planned: <span className="text-foreground">{plannedName}</span>
        </p>
        <div className="space-y-2">
          <Label htmlFor="actual-name">Actual exercise</Label>
          <Input
            id="actual-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What you did"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Machine taken, grip change, etc."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

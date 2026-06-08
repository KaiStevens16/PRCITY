"use client";

import { useState, useEffect, useCallback } from "react";
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
import { removeSessionExercise, updateSessionExercise } from "@/app/actions/training";
import { searchExerciseNames } from "@/app/actions/exercise-catalog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentActual);
      setReason("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open, currentActual]);

  const loadSuggestions = useCallback(async (query: string) => {
    const results = await searchExerciseNames(query);
    setSuggestions(results);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void loadSuggestions(name);
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, name, loadSuggestions]);

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

  async function removeFromSession() {
    const ok = window.confirm(
      "Remove this exercise from this session only? This does not change your protocol template."
    );
    if (!ok) return;
    await removeSessionExercise(sessionExerciseId);
    onOpenChange(false);
    router.refresh();
  }

  function pickSuggestion(s: string) {
    setName(s);
    setShowSuggestions(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Substitution</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Planned: <span className="text-foreground">{plannedName}</span>
        </p>
        <div className="relative space-y-2">
          <Label htmlFor="actual-name">Actual exercise</Label>
          <Input
            id="actual-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Start typing — saved lifts appear below"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border/70 bg-popover py-1 shadow-md">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted/80",
                      s === name.trim() && "bg-muted/60 font-medium"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
          <Button variant="destructive" onClick={removeFromSession}>
            Remove from session
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

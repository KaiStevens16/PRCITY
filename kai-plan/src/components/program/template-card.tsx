"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  updateWorkoutTemplate,
  updateTemplateExercise,
  reorderTemplateExercise,
} from "@/app/actions/program";
import { phaseBadgeVariant } from "@/lib/rotation";
import type { TemplateExercise, WorkoutTemplate } from "@/types/database";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  template: WorkoutTemplate;
  exercises: TemplateExercise[];
  isCurrent: boolean;
};

export function ProgramTemplateCard({ template, exercises, isCurrent }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(isCurrent);
  const [name, setName] = useState(template.name);
  const [dur, setDur] = useState(String(template.estimated_duration_minutes));
  const [warm, setWarm] = useState(template.warmup_note ?? "");

  async function saveMeta() {
    const r = await updateWorkoutTemplate({
      id: template.id,
      name,
      estimated_duration_minutes: parseInt(dur, 10) || 0,
      warmup_note: warm || null,
    });
    if (r && "error" in r && r.error) {
      window.alert(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card className={isCurrent ? "ring-1 ring-ring/50" : ""}>
      <CardHeader
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 space-y-0"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className="inline-flex h-5 w-10 shrink-0 items-center justify-center font-mono tabular-nums text-[10px]"
          >
            #{template.rotation_order}
          </Badge>
          <CardTitle className="min-w-0 flex-1 truncate text-left text-base leading-none md:text-lg">
            {template.name}
          </CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-2 justify-self-end whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Badge
              variant={phaseBadgeVariant(template.phase)}
              className="inline-flex h-5 items-center text-[10px]"
            >
              {template.phase}
            </Badge>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
            aria-hidden
          />
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Est. duration (min)</Label>
              <Input value={dur} onChange={(e) => setDur(e.target.value)} type="text" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Warm-up note</Label>
              <Textarea value={warm} onChange={(e) => setWarm(e.target.value)} rows={2} />
            </div>
          </div>
          <Button type="button" onClick={saveMeta}>
            Save template
          </Button>
          <Separator />
          <p className="text-sm font-medium">Exercises</p>
          <ul className="space-y-4">
            {exercises.map((ex) => (
              <ExerciseRow
                key={ex.id}
                templateId={template.id}
                exercise={ex}
                onChanged={() => router.refresh()}
              />
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

function ExerciseRow({
  templateId,
  exercise,
  onChanged,
}: {
  templateId: string;
  exercise: TemplateExercise;
  onChanged: () => void;
}) {
  const [name, setName] = useState(exercise.exercise_name);
  const [sets, setSets] = useState(String(exercise.target_sets));
  const [rmin, setRmin] = useState(String(exercise.rep_min));
  const [rmax, setRmax] = useState(String(exercise.rep_max));
  const [restMinutes, setRestMinutes] = useState(
    String(Math.round((exercise.rest_seconds / 60) * 10) / 10)
  );
  const [intensity, setIntensity] = useState(exercise.intensity_note ?? "");

  useEffect(() => {
    setName(exercise.exercise_name);
    setSets(String(exercise.target_sets));
    setRmin(String(exercise.rep_min));
    setRmax(String(exercise.rep_max));
    setRestMinutes(String(Math.round((exercise.rest_seconds / 60) * 10) / 10));
    setIntensity(exercise.intensity_note ?? "");
  }, [
    exercise.id,
    exercise.exercise_name,
    exercise.target_sets,
    exercise.rep_min,
    exercise.rep_max,
    exercise.rest_seconds,
    exercise.intensity_note,
  ]);

  async function save() {
    const r = await updateTemplateExercise({
      id: exercise.id,
      exercise_name: name,
      target_sets: parseInt(sets, 10) || 1,
      rep_min: parseInt(rmin, 10) || 0,
      rep_max: parseInt(rmax, 10) || 0,
      rest_seconds: Math.max(
        0,
        Math.round((parseFloat(restMinutes) || 0) * 60)
      ),
      intensity_note: intensity || null,
    });
    if (r && "error" in r && r.error) {
      window.alert(r.error);
      return;
    }
    onChanged();
  }

  async function move(dir: "up" | "down") {
    await reorderTemplateExercise(templateId, exercise.id, dir);
    onChanged();
  }

  return (
    <li className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Exercise</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Sets</Label>
            <Input className="mt-1" value={sets} onChange={(e) => setSets(e.target.value)} type="text" />
          </div>
          <div>
            <Label className="text-xs">Rep min</Label>
            <Input className="mt-1" value={rmin} onChange={(e) => setRmin(e.target.value)} type="text" />
          </div>
          <div>
            <Label className="text-xs">Rep max</Label>
            <Input className="mt-1" value={rmax} onChange={(e) => setRmax(e.target.value)} type="text" />
          </div>
          <div>
            <Label className="text-xs">Rest (min)</Label>
            <Input
              className="mt-1"
              value={restMinutes}
              onChange={(e) => setRestMinutes(e.target.value)}
              type="text"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Intensity / notes</Label>
            <Input className="mt-1" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
          </div>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={save}>
          Save
        </Button>
        <div className="ml-auto flex flex-col gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move("up")}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move("down")}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

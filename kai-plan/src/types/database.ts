export type SessionStatus = "in_progress" | "completed" | "skipped";

export type WorkoutTemplate = {
  id: string;
  name: string;
  phase: string;
  split: string;
  estimated_duration_minutes: number;
  preworkout_note: string | null;
  warmup_note: string | null;
  rotation_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_name: string;
  exercise_group: string | null;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  intensity_note: string | null;
  rest_seconds: number;
  order_index: number;
  allowed_substitutions_json: unknown;
  created_at: string;
  updated_at: string;
};

export type BodyWeightEntry = {
  id: string;
  user_id: string;
  logged_date: string;
  weight: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ReadingLogEntry = {
  id: string;
  user_id: string;
  logged_date: string;
  start_page: number;
  end_page: number;
  minutes_read: number;
  book: string;
  created_at: string;
  updated_at: string;
};

export type DexaScan = {
  id: string;
  user_id: string;
  scan_date: string;
  body_fat_pct: number;
  total_mass_lb: number | null;
  fat_mass_lb: number | null;
  lean_mass_lb: number | null;
  bmc_lb: number | null;
  fat_free_lb: number | null;
  storage_path: string;
  original_filename: string;
  created_at: string;
  updated_at: string;
};

export type ProgramState = {
  id: string;
  user_id: string;
  current_rotation_index: number;
  current_block_name: string;
  current_objective: string;
  timeline_note: string;
  program_metadata: Record<string, unknown>;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  date: string;
  template_id: string | null;
  phase: string;
  split: string;
  status: SessionStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  session_notes: string | null;
  weird_day: boolean;
  weird_day_notes: string | null;
  bodyweight: number | null;
  calories_target: number | null;
  preworkout_done: boolean | null;
  rotation_index_snapshot: number | null;
  created_at: string;
  updated_at: string;
};

export type SessionExercise = {
  id: string;
  session_id: string;
  template_exercise_id: string | null;
  planned_exercise_name: string;
  actual_exercise_name: string;
  is_substitution: boolean;
  substitution_reason: string | null;
  weird_exercise: boolean;
  weird_exercise_notes: string | null;
  exercise_notes: string | null;
  completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type SetLog = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  set_note: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type LastSetPerformanceRow = {
  session_id: string;
  session_date: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  set_note: string | null;
  completed: boolean;
};

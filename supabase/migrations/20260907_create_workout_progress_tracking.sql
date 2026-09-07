-- ==============================================================================
-- Migration: Workout Progress & Exercise Completion Tracking
-- Date: 2026-09-07
-- Description:
--   1. Creates `workout_progress` for day-by-day workout-level completion tracking.
--   2. Creates `exercise_logs` for granular exercise/set-level completion tracking.
--   3. Sets up RLS policies for clients, coaches, and administrators.
-- ==============================================================================

-- 1. Table: workout_progress
CREATE TABLE IF NOT EXISTS public.workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'in_progress', 'skipped', 'missed')),
  completed_at TIMESTAMPTZ,
  calories_burned INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_workout_date UNIQUE (user_id, workout_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_workout_progress_user_date 
  ON public.workout_progress(user_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_progress_status 
  ON public.workout_progress(user_id, status);

-- 2. Table: exercise_logs
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_progress_id UUID REFERENCES public.workout_progress(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  sets_completed INTEGER DEFAULT 0,
  reps_completed INTEGER DEFAULT 0,
  weight_kg NUMERIC(6, 2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_exercise_date UNIQUE (user_id, exercise_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date 
  ON public.exercise_logs(user_id, scheduled_date DESC);

-- 3. Enable RLS
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for workout_progress
CREATE POLICY "Clients can view own workout progress"
ON public.workout_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert own workout progress"
ON public.workout_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update own workout progress"
ON public.workout_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Clients can delete own workout progress"
ON public.workout_progress FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coaches and Admins can view client workout progress"
ON public.workout_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'coach')
  )
);

-- 5. RLS Policies for exercise_logs
CREATE POLICY "Clients can view own exercise logs"
ON public.exercise_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert own exercise logs"
ON public.exercise_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update own exercise logs"
ON public.exercise_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Clients can delete own exercise logs"
ON public.exercise_logs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Coaches and Admins can view client exercise logs"
ON public.exercise_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'coach')
  )
);

-- 6. Stored Procedure: update_workout_progress
-- Atomically updates/inserts workout_progress based on exercise_logs completions for a given date
CREATE OR REPLACE FUNCTION public.update_workout_progress(
  p_user_id UUID,
  p_workout_id UUID,
  p_scheduled_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_total_exercises INTEGER := 0;
  v_completed_exercises INTEGER := 0;
  v_workout_name TEXT := 'Workout Session';
  v_calories_burned INTEGER := 0;
  v_duration_minutes INTEGER := 0;
  v_status TEXT := 'in_progress';
  v_result_id UUID;
BEGIN
  -- Get workout metadata
  SELECT name, COALESCE(calories_burned, 0), COALESCE(duration_minutes, 0)
  INTO v_workout_name, v_calories_burned, v_duration_minutes
  FROM public.workouts 
  WHERE id = p_workout_id;
  
  -- Count total exercises configured for this workout
  SELECT COUNT(*) INTO v_total_exercises 
  FROM public.exercises 
  WHERE workout_id = p_workout_id;
  
  -- Count completed exercises for this user and scheduled date
  SELECT COUNT(*) INTO v_completed_exercises 
  FROM public.exercise_logs 
  WHERE user_id = p_user_id 
    AND scheduled_date = p_scheduled_date 
    AND exercise_id IN (SELECT id FROM public.exercises WHERE workout_id = p_workout_id)
    AND completed = true;
  
  -- Determine workout progress status
  IF v_total_exercises = 0 THEN
    v_status := 'completed';
  ELSIF v_completed_exercises >= v_total_exercises AND v_total_exercises > 0 THEN
    v_status := 'completed';
  ELSIF v_completed_exercises > 0 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'in_progress';
  END IF;
  
  -- Upsert workout_progress row
  INSERT INTO public.workout_progress (
    user_id,
    workout_id,
    workout_name,
    scheduled_date,
    status,
    calories_burned,
    duration_minutes,
    completed_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_workout_id,
    COALESCE(v_workout_name, 'Workout Session'),
    p_scheduled_date,
    v_status,
    v_calories_burned,
    v_duration_minutes,
    CASE WHEN v_status = 'completed' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, workout_id, scheduled_date)
  DO UPDATE SET
    status = EXCLUDED.status,
    completed_at = CASE 
      WHEN EXCLUDED.status = 'completed' AND workout_progress.completed_at IS NULL THEN now()
      WHEN EXCLUDED.status = 'completed' THEN workout_progress.completed_at
      ELSE NULL 
    END,
    workout_name = EXCLUDED.workout_name,
    calories_burned = EXCLUDED.calories_burned,
    duration_minutes = EXCLUDED.duration_minutes,
    updated_at = now()
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'success', true,
    'workout_progress_id', v_result_id,
    'status', v_status,
    'total_exercises', v_total_exercises,
    'completed_exercises', v_completed_exercises
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workout_progress_updated_at ON public.workout_progress;
CREATE TRIGGER update_workout_progress_updated_at
  BEFORE UPDATE ON public.workout_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. View for User Workout Summary
CREATE OR REPLACE VIEW public.user_workout_summary AS
SELECT 
  user_id,
  COUNT(*) AS total_workouts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_workouts,
  COUNT(CASE WHEN status = 'missed' THEN 1 END) AS missed_workouts,
  COUNT(CASE WHEN status = 'skipped' THEN 1 END) AS skipped_workouts,
  ROUND(
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) AS completion_rate,
  SUM(calories_burned) AS total_calories_burned,
  AVG(calories_burned) AS avg_calories_burned,
  SUM(duration_minutes) AS total_minutes,
  AVG(duration_minutes) AS avg_duration_minutes,
  MAX(completed_at) AS last_workout_date
FROM public.workout_progress
GROUP BY user_id;

GRANT SELECT ON public.user_workout_summary TO authenticated;

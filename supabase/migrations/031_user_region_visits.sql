-- 깃발 방문 시군구 누적 (핀 상태와 분리)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region_visits_backfilled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.user_region_visits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL,
  first_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pin_count INTEGER NOT NULL DEFAULT 1 CHECK (pin_count > 0),
  PRIMARY KEY (user_id, region_code)
);

CREATE INDEX IF NOT EXISTS idx_user_region_visits_user
  ON public.user_region_visits (user_id);

ALTER TABLE public.user_region_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_region_visits_select_own" ON public.user_region_visits;
CREATE POLICY "user_region_visits_select_own"
  ON public.user_region_visits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_region_visit(
  target_user_id UUID,
  target_region_code TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_region_visits (
    user_id,
    region_code,
    first_visited_at,
    pin_count
  )
  VALUES (
    target_user_id,
    target_region_code,
    visited_at,
    1
  )
  ON CONFLICT (user_id, region_code)
  DO UPDATE SET
    pin_count = public.user_region_visits.pin_count + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_region_visit(
  target_user_id UUID,
  target_region_code TEXT,
  visited_at TIMESTAMPTZ,
  visit_pin_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_region_visits (
    user_id,
    region_code,
    first_visited_at,
    pin_count
  )
  VALUES (
    target_user_id,
    target_region_code,
    visited_at,
    visit_pin_count
  )
  ON CONFLICT (user_id, region_code)
  DO UPDATE SET
    pin_count = EXCLUDED.pin_count,
    first_visited_at = LEAST(
      public.user_region_visits.first_visited_at,
      EXCLUDED.first_visited_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_region_visit(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_region_visit(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_region_visit(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_region_visit(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

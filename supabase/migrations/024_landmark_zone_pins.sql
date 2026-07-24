-- Phase B: 랜드마크 존 깃발 + 개인 합산 점수
ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS landmark_id UUID REFERENCES public.landmarks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pins_landmark_active
  ON public.pins (landmark_id)
  WHERE status = 'active' AND landmark_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.landmark_user_scores (
  landmark_id UUID NOT NULL REFERENCES public.landmarks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  score_reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (landmark_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_landmark_user_scores_rank
  ON public.landmark_user_scores (landmark_id, score DESC, score_reached_at ASC);

ALTER TABLE public.landmark_user_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landmark_user_scores_select" ON public.landmark_user_scores;
CREATE POLICY "landmark_user_scores_select"
  ON public.landmark_user_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.landmarks l
      WHERE l.id = landmark_id AND l.map_visible = TRUE
    )
  );

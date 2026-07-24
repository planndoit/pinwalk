-- 깃발 ↔ 랜드마크 다대다 (겹치는 존에 모두 적용)
CREATE TABLE IF NOT EXISTS public.pin_landmarks (
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  landmark_id UUID NOT NULL REFERENCES public.landmarks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pin_id, landmark_id)
);

CREATE INDEX IF NOT EXISTS idx_pin_landmarks_landmark
  ON public.pin_landmarks (landmark_id);

-- 기존 단일 landmark_id 데이터 이전
INSERT INTO public.pin_landmarks (pin_id, landmark_id)
SELECT id, landmark_id
FROM public.pins
WHERE landmark_id IS NOT NULL
ON CONFLICT (pin_id, landmark_id) DO NOTHING;

DROP INDEX IF EXISTS idx_pins_landmark_active;
ALTER TABLE public.pins DROP COLUMN IF EXISTS landmark_id;

ALTER TABLE public.pin_landmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pin_landmarks_select" ON public.pin_landmarks;
CREATE POLICY "pin_landmarks_select"
  ON public.pin_landmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.landmarks l
      WHERE l.id = landmark_id AND l.map_visible = TRUE
    )
  );

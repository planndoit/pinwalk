-- 전국도시공원정보표준데이터 공원을 랜드마크로 적재.
-- 관리번호(manageNo)는 제공기관 간 중복되므로 원본 공원명과 함께 식별한다.
ALTER TABLE public.landmarks DROP CONSTRAINT IF EXISTS landmarks_source_check;
ALTER TABLE public.landmarks
  ADD CONSTRAINT landmarks_source_check
  CHECK (source IN ('tourapi', 'manual', 'park'));

ALTER TABLE public.landmarks
  ADD COLUMN IF NOT EXISTS park_manage_no TEXT,
  ADD COLUMN IF NOT EXISTS park_source_name TEXT,
  ADD COLUMN IF NOT EXISTS park_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS landmarks_park_source_uidx
  ON public.landmarks (park_manage_no, park_source_name)
  WHERE park_manage_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landmarks_source
  ON public.landmarks (source);

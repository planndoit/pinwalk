-- 아바타 이미지 캐시 기준 시각 (아바타 변경 시에만 갱신)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

UPDATE public.profiles
SET avatar_updated_at = updated_at
WHERE avatar_mime IS NOT NULL
  AND avatar_updated_at IS NULL;

-- 공원 면적(㎡, 전국도시공원정보표준데이터 parkAr). 관리자 목록 면적순 정렬용.
ALTER TABLE public.landmarks
  ADD COLUMN IF NOT EXISTS park_area_sqm DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_landmarks_park_area
  ON public.landmarks (park_area_sqm DESC NULLS LAST);

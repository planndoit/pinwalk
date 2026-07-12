-- 지도에 공개되는 장소 전화번호 (담당자 연락처와 별도)
ALTER TABLE public.premium_promotion_requests
  ADD COLUMN IF NOT EXISTS place_phone TEXT;

ALTER TABLE public.premium_places
  ADD COLUMN IF NOT EXISTS place_phone TEXT;

-- 프리미엄 홍보 요청/장소에 도로명 주소 텍스트 추가
ALTER TABLE public.premium_promotion_requests
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.premium_places
  ADD COLUMN IF NOT EXISTS address TEXT;

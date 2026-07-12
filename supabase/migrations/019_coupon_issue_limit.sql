-- 쿠폰 전체 획득(등록) 가능 상한. 기존 쿠폰은 운영 중단을 막기 위해 넉넉한 기본값.
ALTER TABLE public.premium_coupons
  ADD COLUMN IF NOT EXISTS issue_limit INTEGER NOT NULL DEFAULT 1000
  CHECK (issue_limit >= 0);

COMMENT ON COLUMN public.premium_coupons.issue_limit IS
  '전체 사용자 기준 등록(획득) 가능 상한. 등록 수 >= issue_limit 이면 추가 발행/획득 불가';

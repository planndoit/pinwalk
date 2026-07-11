-- 프리미엄 홍보 요청: 선택 항목을 NULL 허용
ALTER TABLE public.premium_promotion_requests
  ALTER COLUMN contact_email DROP NOT NULL,
  ALTER COLUMN contact_name DROP NOT NULL,
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lng DROP NOT NULL;

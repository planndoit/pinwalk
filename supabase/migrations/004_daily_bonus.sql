-- 매일 출석 보너스: 마지막 지급 시각 기록 및 거래 유형 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_daily_bonus_at TIMESTAMPTZ;

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'signup_bonus',
    'create_pin',
    'conquer_attempt',
    'random_point_claim',
    'admin_adjust',
    'daily_bonus'
  ));

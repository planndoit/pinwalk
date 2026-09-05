-- 포인트 찾기 통행료: 남의 깃발 영역에서 포인트 획득 시 주인자에게 10%

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'signup_bonus',
    'create_pin',
    'reinforce_pin',
    'conquer_attempt',
    'random_point_claim',
    'admin_adjust',
    'daily_bonus',
    'defense_reward',
    'crew_create',
    'pin_toll'
  ));

CREATE TABLE IF NOT EXISTS public.pin_tolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  random_point_id UUID NOT NULL REFERENCES public.random_points(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_points INTEGER NOT NULL CHECK (base_points > 0),
  toll_points INTEGER NOT NULL CHECK (toll_points > 0),
  point_lat DOUBLE PRECISION NOT NULL,
  point_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_tolls_pin_created
  ON public.pin_tolls (pin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_tolls_owner_created
  ON public.pin_tolls (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_tolls_random_point
  ON public.pin_tolls (random_point_id);

ALTER TABLE public.pin_tolls ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.get_user_timeline(UUID, INT, TIMESTAMPTZ);

CREATE FUNCTION public.get_user_timeline(
  target_user_id UUID,
  page_limit INT DEFAULT 20,
  before_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  title TEXT,
  description TEXT,
  amount BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM (
    SELECT
      pt.id,
      'point'::TEXT AS event_type,
      CASE pt.type
        WHEN 'create_pin' THEN '깃발 꽂기'
        WHEN 'reinforce_pin' THEN '깃발 강화'
        WHEN 'random_point_claim' THEN '포인트 획득'
        WHEN 'pin_toll' THEN '통행료'
        WHEN 'daily_bonus' THEN '출석 보너스'
        WHEN 'defense_reward' THEN '방어 성공'
        WHEN 'signup_bonus' THEN '가입 보너스'
        WHEN 'crew_create' THEN '크루 생성'
        ELSE '포인트 변동'
      END AS title,
      pt.description AS description,
      pt.amount::BIGINT AS amount,
      pt.created_at AS created_at
    FROM point_transactions pt
    WHERE pt.user_id = target_user_id
      AND pt.type != 'conquer_attempt'

    UNION ALL

    SELECT
      pin_attempts.id,
      'conquer'::TEXT,
      CASE
        WHEN pin_attempts.success THEN '점령 성공'
        ELSE '점령 실패'
      END,
      pin_attempts.selected_probability::TEXT || '% 시도',
      (-pin_attempts.cost)::BIGINT,
      pin_attempts.created_at
    FROM pin_attempts
    WHERE pin_attempts.attacker_id = target_user_id

    UNION ALL

    SELECT
      pin_attempts.id,
      'conquered_by'::TEXT,
      '점령 당함'::TEXT,
      '상대에게 영역을 빼앗겼어요'::TEXT,
      NULL::BIGINT,
      pin_attempts.created_at
    FROM pin_attempts
    JOIN pins ON pins.id = pin_attempts.target_pin_id
    WHERE pins.user_id = target_user_id
      AND pin_attempts.success = true
  ) AS events
  WHERE before_at IS NULL OR events.created_at < before_at
  ORDER BY events.created_at DESC
  LIMIT page_limit;
$$;

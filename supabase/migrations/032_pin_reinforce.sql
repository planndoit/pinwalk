-- 깃발 강화: cost 100~1000(100 단위), 일반 반경 100m 고정, last_reinforced_at

ALTER TABLE public.pins
  DROP CONSTRAINT IF EXISTS pins_cost_check;

ALTER TABLE public.pins
  ADD CONSTRAINT pins_cost_check CHECK (
    cost IN (100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)
  );

ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS last_reinforced_at TIMESTAMPTZ;

-- 랜드마크에 속하지 않은 활성·비활성 일반 깃발 반경을 100m로 통일
UPDATE public.pins p
SET radius_meters = 100,
    updated_at = NOW()
WHERE p.radius_meters IS DISTINCT FROM 100
  AND NOT EXISTS (
    SELECT 1
    FROM public.pin_landmarks pl
    WHERE pl.pin_id = p.id
  );

-- 랜드마크 깃발은 5m 유지
UPDATE public.pins p
SET radius_meters = 5,
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1
    FROM public.pin_landmarks pl
    WHERE pl.pin_id = p.id
  )
  AND p.radius_meters IS DISTINCT FROM 5;

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
    'crew_create'
  ));

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

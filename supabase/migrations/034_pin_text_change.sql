-- 최대 강화 깃발 문구 변경 (50P, 쿨다운 없음)

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'signup_bonus',
    'create_pin',
    'reinforce_pin',
    'update_pin_text',
    'conquer_attempt',
    'random_point_claim',
    'admin_adjust',
    'daily_bonus',
    'defense_reward',
    'crew_create',
    'pin_toll'
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
        WHEN 'update_pin_text' THEN '깃발 문구 변경'
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

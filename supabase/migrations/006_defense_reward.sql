-- 방어 성공 보상: 거래 유형 추가 및 타임라인에 방어 성공 표시
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
    'daily_bonus',
    'defense_reward'
  ));

CREATE OR REPLACE FUNCTION public.get_user_timeline(
  target_user_id UUID,
  page_limit INT DEFAULT 20,
  before_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  title TEXT,
  description TEXT,
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
      pins.id,
      'pin_create'::TEXT AS event_type,
      '깃발 꽂기'::TEXT AS title,
      pins.text AS description,
      pins.created_at
    FROM pins
    WHERE pins.user_id = target_user_id

    UNION ALL

    SELECT
      point_transactions.id,
      'point_earn'::TEXT,
      CASE
        WHEN point_transactions.type = 'defense_reward' THEN '방어 성공'
        ELSE '포인트 획득'
      END,
      COALESCE(point_transactions.description, point_transactions.amount::TEXT || 'P'),
      point_transactions.created_at
    FROM point_transactions
    WHERE point_transactions.user_id = target_user_id
      AND point_transactions.amount > 0

    UNION ALL

    SELECT
      pin_attempts.id,
      'conquer'::TEXT,
      CASE
        WHEN pin_attempts.success THEN '점령 성공'
        ELSE '점령 실패'
      END,
      pin_attempts.selected_probability::TEXT || '% 시도',
      pin_attempts.created_at
    FROM pin_attempts
    WHERE pin_attempts.attacker_id = target_user_id
  ) AS events
  WHERE before_at IS NULL OR events.created_at < before_at
  ORDER BY events.created_at DESC
  LIMIT page_limit;
$$;

-- 활동 내역 개편: 포인트 증감 금액 반환, 소모 거래 및 점령 당함 포함
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
        WHEN 'conquer_attempt' THEN '점령 시도'
        WHEN 'random_point_claim' THEN '포인트 획득'
        WHEN 'daily_bonus' THEN '출석 보너스'
        WHEN 'defense_reward' THEN '방어 성공'
        WHEN 'signup_bonus' THEN '가입 보너스'
        ELSE '포인트 변동'
      END AS title,
      pt.description AS description,
      pt.amount::BIGINT AS amount,
      pt.created_at AS created_at
    FROM point_transactions pt
    WHERE pt.user_id = target_user_id

    UNION ALL

    SELECT
      pin_attempts.id,
      'conquer'::TEXT,
      CASE
        WHEN pin_attempts.success THEN '점령 성공'
        ELSE '점령 실패'
      END,
      pin_attempts.selected_probability::TEXT || '% 시도',
      NULL::BIGINT,
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

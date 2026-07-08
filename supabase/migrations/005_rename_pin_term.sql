-- '발도장' 용어를 '깃발'로 변경: 타임라인 함수 문구 갱신
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
      '포인트 획득'::TEXT,
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

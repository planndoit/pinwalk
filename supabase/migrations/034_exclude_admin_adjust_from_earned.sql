-- 누적 포인트 랭킹·통계에서 관리자 지급(admin_adjust) 제외

CREATE OR REPLACE FUNCTION public.get_ranking(rtype TEXT, result_limit INT DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  value BIGINT,
  secondary_value BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      p.id AS user_id,
      p.nickname,
      CASE rtype
        WHEN 'combat_power' THEN COALESCE((
          SELECT SUM(pi.cost)::BIGINT
          FROM pins pi
          WHERE pi.user_id = p.id
            AND pi.status = 'active'
        ), 0)
        WHEN 'total_earned' THEN COALESCE((
          SELECT SUM(pt.amount)::BIGINT
          FROM point_transactions pt
          WHERE pt.user_id = p.id
            AND pt.amount > 0
            AND pt.type <> 'admin_adjust'
        ), 0)
        WHEN 'active_pins' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM pins pi
          WHERE pi.user_id = p.id
            AND pi.status = 'active'
        ), 0)
        WHEN 'conquers' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM pin_attempts pa
          WHERE pa.attacker_id = p.id AND pa.success = true
        ), 0)
        ELSE 0::BIGINT
      END AS value,
      CASE
        WHEN rtype = 'total_earned' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM point_transactions pt
          WHERE pt.user_id = p.id
            AND pt.amount > 0
            AND pt.type <> 'admin_adjust'
        ), 0)
        ELSE NULL::BIGINT
      END AS secondary_value
    FROM profiles p
    WHERE p.username IS NOT NULL
  )
  SELECT ranked.user_id, ranked.nickname, ranked.value, ranked.secondary_value
  FROM ranked
  WHERE ranked.value > 0
  ORDER BY ranked.value DESC, ranked.nickname ASC
  LIMIT result_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id UUID)
RETURNS TABLE (
  total_earned BIGINT,
  earn_count BIGINT,
  active_pins BIGINT,
  total_pins BIGINT,
  conquers BIGINT,
  combat_power BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT SUM(pt.amount)::BIGINT
      FROM point_transactions pt
      WHERE pt.user_id = target_user_id
        AND pt.amount > 0
        AND pt.type <> 'admin_adjust'
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM point_transactions pt
      WHERE pt.user_id = target_user_id
        AND pt.amount > 0
        AND pt.type <> 'admin_adjust'
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM pins pi
      WHERE pi.user_id = target_user_id
        AND pi.status = 'active'
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM pins pi
      WHERE pi.user_id = target_user_id
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM pin_attempts pa
      WHERE pa.attacker_id = target_user_id AND pa.success = true
    ), 0),
    COALESCE((
      SELECT SUM(pi.cost)::BIGINT
      FROM pins pi
      WHERE pi.user_id = target_user_id
        AND pi.status = 'active'
    ), 0);
$$;

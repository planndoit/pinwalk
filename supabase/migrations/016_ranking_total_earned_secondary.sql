-- 누적 포인트 랭킹에 획득 횟수를 secondary_value로 함께 반환
DROP FUNCTION IF EXISTS public.get_ranking(TEXT, INT);

CREATE FUNCTION public.get_ranking(rtype TEXT, result_limit INT DEFAULT 100)
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
          WHERE pt.user_id = p.id AND pt.amount > 0
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
          WHERE pt.user_id = p.id AND pt.amount > 0
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

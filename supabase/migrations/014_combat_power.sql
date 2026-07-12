-- 전투력: 현재 보유(active) 깃발의 cost 합
DROP FUNCTION IF EXISTS public.get_user_stats(UUID);

CREATE FUNCTION public.get_user_stats(target_user_id UUID)
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
      WHERE pt.user_id = target_user_id AND pt.amount > 0
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM point_transactions pt
      WHERE pt.user_id = target_user_id AND pt.amount > 0
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

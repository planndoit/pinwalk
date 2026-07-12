-- 깃발 투자 포인트 + 만료 제거
ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS cost INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.pins
  DROP CONSTRAINT IF EXISTS pins_cost_check;

ALTER TABLE public.pins
  ADD CONSTRAINT pins_cost_check CHECK (cost IN (100, 300, 500, 1000));

ALTER TABLE public.pins
  ALTER COLUMN expires_at DROP NOT NULL;

DROP POLICY IF EXISTS "pins_select_active" ON public.pins;
CREATE POLICY "pins_select_active"
  ON public.pins FOR SELECT
  USING (status = 'active');

CREATE OR REPLACE FUNCTION public.get_ranking(rtype TEXT, result_limit INT DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  value BIGINT
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
        WHEN 'total_earned' THEN COALESCE((
          SELECT SUM(pt.amount)::BIGINT
          FROM point_transactions pt
          WHERE pt.user_id = p.id AND pt.amount > 0
        ), 0)
        WHEN 'earn_count' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM point_transactions pt
          WHERE pt.user_id = p.id AND pt.amount > 0
        ), 0)
        WHEN 'active_pins' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM pins pi
          WHERE pi.user_id = p.id
            AND pi.status = 'active'
        ), 0)
        WHEN 'total_pins' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM pins pi
          WHERE pi.user_id = p.id
        ), 0)
        WHEN 'conquers' THEN COALESCE((
          SELECT COUNT(*)::BIGINT
          FROM pin_attempts pa
          WHERE pa.attacker_id = p.id AND pa.success = true
        ), 0)
        ELSE 0::BIGINT
      END AS value
    FROM profiles p
    WHERE p.username IS NOT NULL
  )
  SELECT ranked.user_id, ranked.nickname, ranked.value
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
  conquers BIGINT
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
    ), 0);
$$;

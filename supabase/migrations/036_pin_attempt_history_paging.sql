-- 깃발 점령 기록: (created_at, id) 커서 기반 페이지 조회 + 정확한 성공/실패 집계

CREATE INDEX IF NOT EXISTS idx_pin_attempts_target_failed_created
  ON public.pin_attempts (target_pin_id, created_at DESC, id DESC)
  WHERE success = false;

DROP FUNCTION IF EXISTS public.get_pin_attempt_history(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_pin_attempt_history(
  p_pin_id UUID,
  result_limit INT DEFAULT 50,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  attacker_id UUID,
  attacker_nickname TEXT,
  previous_owner_nickname TEXT,
  selected_probability INTEGER,
  cost INTEGER,
  success BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE success_chain AS (
    SELECT
      pa.id,
      pa.attacker_id,
      pa.target_pin_id,
      pa.new_pin_id,
      pa.selected_probability,
      pa.cost,
      pa.success,
      pa.created_at,
      0 AS depth
    FROM pin_attempts pa
    WHERE pa.new_pin_id = p_pin_id
      AND pa.success = true

    UNION ALL

    SELECT
      pa.id,
      pa.attacker_id,
      pa.target_pin_id,
      pa.new_pin_id,
      pa.selected_probability,
      pa.cost,
      pa.success,
      pa.created_at,
      sc.depth + 1
    FROM success_chain sc
    JOIN pin_attempts pa
      ON pa.new_pin_id = sc.target_pin_id
     AND pa.success = true
    WHERE sc.depth < 19
      AND pa.id IS DISTINCT FROM sc.id
  ),
  history AS (
    SELECT
      sc.id,
      sc.attacker_id,
      COALESCE(ap.nickname, '익명의 워커') AS attacker_nickname,
      COALESCE(op.nickname, '익명의 워커') AS previous_owner_nickname,
      sc.selected_probability,
      sc.cost,
      sc.success,
      sc.created_at
    FROM success_chain sc
    LEFT JOIN profiles ap ON ap.id = sc.attacker_id
    LEFT JOIN pins tp ON tp.id = sc.target_pin_id
    LEFT JOIN profiles op ON op.id = tp.user_id

    UNION ALL

    SELECT
      f.id,
      f.attacker_id,
      COALESCE(ap.nickname, '익명의 워커') AS attacker_nickname,
      NULL::TEXT AS previous_owner_nickname,
      f.selected_probability,
      f.cost,
      f.success,
      f.created_at
    FROM (
      SELECT
        pa.id,
        pa.attacker_id,
        pa.selected_probability,
        pa.cost,
        pa.success,
        pa.created_at
      FROM pin_attempts pa
      WHERE pa.target_pin_id = p_pin_id
        AND pa.success = false
        AND (
          p_before_created_at IS NULL
          OR (pa.created_at, pa.id) < (p_before_created_at, p_before_id)
        )
      ORDER BY pa.created_at DESC, pa.id DESC
      LIMIT result_limit
    ) f
    LEFT JOIN profiles ap ON ap.id = f.attacker_id
  )
  SELECT
    h.id,
    h.attacker_id,
    h.attacker_nickname,
    h.previous_owner_nickname,
    h.selected_probability,
    h.cost,
    h.success,
    h.created_at
  FROM history h
  WHERE p_before_created_at IS NULL
     OR (h.created_at, h.id) < (p_before_created_at, p_before_id)
  ORDER BY h.created_at DESC, h.id DESC
  LIMIT result_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_attempt_history(UUID, INT, TIMESTAMPTZ, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.get_pin_attempt_summary(p_pin_id UUID)
RETURNS TABLE (
  success_count INTEGER,
  fail_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE success_chain AS (
    SELECT
      pa.id,
      pa.target_pin_id,
      0 AS depth
    FROM pin_attempts pa
    WHERE pa.new_pin_id = p_pin_id
      AND pa.success = true

    UNION ALL

    SELECT
      pa.id,
      pa.target_pin_id,
      sc.depth + 1
    FROM success_chain sc
    JOIN pin_attempts pa
      ON pa.new_pin_id = sc.target_pin_id
     AND pa.success = true
    WHERE sc.depth < 19
      AND pa.id IS DISTINCT FROM sc.id
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM success_chain) AS success_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM pin_attempts pa
      WHERE pa.target_pin_id = p_pin_id
        AND pa.success = false
    ) AS fail_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_attempt_summary(UUID) TO service_role;

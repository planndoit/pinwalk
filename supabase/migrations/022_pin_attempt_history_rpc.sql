-- 깃발 점령 기록: 체인 순차 조회 대신 재귀 CTE 1회 조회
-- new_pin_id 역추적용 부분 인덱스

CREATE INDEX IF NOT EXISTS idx_pin_attempts_new_pin
  ON public.pin_attempts (new_pin_id)
  WHERE new_pin_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_pin_attempt_history(
  p_pin_id UUID,
  result_limit INT DEFAULT 50
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
      ORDER BY pa.created_at DESC
      LIMIT 50
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
  ORDER BY h.created_at DESC
  LIMIT result_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_attempt_history(UUID, INT) TO service_role;

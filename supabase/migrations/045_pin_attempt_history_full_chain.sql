-- 깃발 점령 기록: 점령으로 이어진 이전 깃발들의 성공·실패를 모두 포함

DROP FUNCTION IF EXISTS public.get_pin_attempt_history(UUID, INT, TIMESTAMPTZ, UUID);

CREATE OR REPLACE FUNCTION public.get_pin_attempt_history(
  p_pin_id UUID,
  result_limit INT
)
RETURNS TABLE (
  id UUID,
  attacker_id UUID,
  attacker_nickname TEXT,
  target_owner_nickname TEXT,
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
  WITH RECURSIVE pin_chain(pin_id) AS (
    SELECT p_pin_id

    UNION

    SELECT pa.target_pin_id
    FROM pin_chain pc
    JOIN pin_attempts pa
      ON pa.new_pin_id = pc.pin_id
     AND pa.success = true
  )
  SELECT
    pa.id,
    pa.attacker_id,
    COALESCE(ap.nickname, '익명의 워커') AS attacker_nickname,
    COALESCE(op.nickname, '익명의 워커') AS target_owner_nickname,
    pa.selected_probability,
    pa.cost,
    pa.success,
    pa.created_at
  FROM pin_chain pc
  JOIN pin_attempts pa ON pa.target_pin_id = pc.pin_id
  LEFT JOIN profiles ap ON ap.id = pa.attacker_id
  LEFT JOIN pins tp ON tp.id = pa.target_pin_id
  LEFT JOIN profiles op ON op.id = tp.user_id
  ORDER BY pa.created_at DESC, pa.id DESC
  LIMIT result_limit;
$$;

REVOKE ALL ON FUNCTION public.get_pin_attempt_history(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pin_attempt_history(UUID, INT) TO service_role;

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
  WITH RECURSIVE pin_chain(pin_id) AS (
    SELECT p_pin_id

    UNION

    SELECT pa.target_pin_id
    FROM pin_chain pc
    JOIN pin_attempts pa
      ON pa.new_pin_id = pc.pin_id
     AND pa.success = true
  )
  SELECT
    COUNT(*) FILTER (WHERE pa.success)::INTEGER AS success_count,
    COUNT(*) FILTER (WHERE NOT pa.success)::INTEGER AS fail_count
  FROM pin_chain pc
  JOIN pin_attempts pa ON pa.target_pin_id = pc.pin_id;
$$;

-- 깃발 수확: 매 정각 cost의 일정 비율 적립(지연 계산), 직접·원격 수확, 점령 처리 실패 환불

CREATE OR REPLACE FUNCTION public.pin_harvest_hour_index(ts TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT floor(extract(epoch FROM ts) / 3600)::BIGINT;
$$;

CREATE OR REPLACE FUNCTION public.pin_harvest_amount(
  p_cost INTEGER,
  p_stored INTEGER,
  p_settled_at TIMESTAMPTZ,
  p_now TIMESTAMPTZ,
  p_hourly_percent INTEGER,
  p_max_hours INTEGER
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    (p_cost * p_hourly_percent / 100)::BIGINT * p_max_hours,
    p_stored::BIGINT
      + GREATEST(
          0,
          public.pin_harvest_hour_index(p_now)
            - public.pin_harvest_hour_index(p_settled_at)
        ) * (p_cost * p_hourly_percent / 100)
  )::INTEGER;
$$;

REVOKE ALL ON FUNCTION public.pin_harvest_hour_index(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_harvest_amount(INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pin_harvest_hour_index(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.pin_harvest_amount(INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO service_role;

ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS harvest_stored INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS harvest_settled_at TIMESTAMPTZ NOT NULL
  DEFAULT to_timestamp(floor(extract(epoch FROM NOW()) / 3600) * 3600);

ALTER TABLE public.pins
  DROP CONSTRAINT IF EXISTS pins_harvest_stored_check;

ALTER TABLE public.pins
  ADD CONSTRAINT pins_harvest_stored_check CHECK (harvest_stored >= 0);

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN (
    'signup_bonus',
    'create_pin',
    'reinforce_pin',
    'update_pin_text',
    'conquer_attempt',
    'random_point_claim',
    'admin_adjust',
    'daily_bonus',
    'defense_reward',
    'crew_create',
    'pin_toll',
    'mission_reward',
    'harvest_direct',
    'harvest_remote',
    'conquer_refund'
  ));

CREATE INDEX IF NOT EXISTS idx_point_transactions_refund_related
  ON public.point_transactions (related_id)
  WHERE type = 'conquer_refund';

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
        WHEN 'reinforce_pin' THEN '깃발 강화'
        WHEN 'update_pin_text' THEN '깃발 문구 변경'
        WHEN 'random_point_claim' THEN '포인트 획득'
        WHEN 'pin_toll' THEN '통행료'
        WHEN 'daily_bonus' THEN '출석 보너스'
        WHEN 'defense_reward' THEN '방어 성공'
        WHEN 'signup_bonus' THEN '가입 보너스'
        WHEN 'crew_create' THEN '크루 생성'
        WHEN 'mission_reward' THEN '미션 보상'
        WHEN 'harvest_direct' THEN '직접 수확'
        WHEN 'harvest_remote' THEN '원격 수확'
        WHEN 'conquer_refund' THEN '점령 처리 실패 환불'
        WHEN 'conquer_attempt' THEN '점령 시도'
        ELSE '포인트 변동'
      END AS title,
      pt.description AS description,
      pt.amount::BIGINT AS amount,
      pt.created_at AS created_at
    FROM point_transactions pt
    WHERE pt.user_id = target_user_id
      AND (
        pt.type != 'conquer_attempt'
        OR EXISTS (
          SELECT 1
          FROM point_transactions refund
          WHERE refund.type = 'conquer_refund'
            AND refund.related_id = pt.id
        )
      )

    UNION ALL

    SELECT
      pin_attempts.id,
      'conquer'::TEXT,
      CASE
        WHEN pin_attempts.success THEN '점령 성공'
        ELSE '점령 실패'
      END,
      pin_attempts.selected_probability::TEXT || '% 시도',
      (-pin_attempts.cost)::BIGINT,
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
            AND pt.type NOT IN (
              'admin_adjust',
              'mission_reward',
              'harvest_direct',
              'harvest_remote',
              'conquer_refund'
            )
        ), 0)
        WHEN 'harvest_earned' THEN COALESCE((
          SELECT SUM(pt.amount)::BIGINT
          FROM point_transactions pt
          WHERE pt.user_id = p.id
            AND pt.type IN ('harvest_direct', 'harvest_remote')
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
            AND pt.type NOT IN (
              'admin_adjust',
              'mission_reward',
              'harvest_direct',
              'harvest_remote',
              'conquer_refund'
            )
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
        AND pt.type NOT IN (
          'admin_adjust',
          'mission_reward',
          'harvest_direct',
          'harvest_remote',
          'conquer_refund'
        )
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM point_transactions pt
      WHERE pt.user_id = target_user_id
        AND pt.amount > 0
        AND pt.type NOT IN (
          'admin_adjust',
          'mission_reward',
          'harvest_direct',
          'harvest_remote',
          'conquer_refund'
        )
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

DROP FUNCTION IF EXISTS public.apply_point_transaction(UUID, INTEGER, TEXT, TEXT, UUID);

CREATE FUNCTION public.apply_point_transaction(
  target_user_id UUID,
  target_amount INTEGER,
  target_type TEXT,
  target_description TEXT,
  target_related_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_points INTEGER,
  error_code TEXT,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resulting_points INTEGER;
  inserted_id UUID;
BEGIN
  UPDATE public.profiles
  SET
    points = points + target_amount,
    updated_at = NOW()
  WHERE id = target_user_id
    AND (target_amount > 0 OR points + target_amount >= 0)
  RETURNING points INTO resulting_points;

  IF resulting_points IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
      RETURN QUERY SELECT FALSE, NULL::INTEGER, 'insufficient_points'::TEXT, NULL::UUID;
    ELSE
      RETURN QUERY SELECT FALSE, NULL::INTEGER, 'profile_not_found'::TEXT, NULL::UUID;
    END IF;
    RETURN;
  END IF;

  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    description,
    related_id
  )
  VALUES (
    target_user_id,
    target_amount,
    target_type,
    target_description,
    target_related_id
  )
  RETURNING id INTO inserted_id;

  RETURN QUERY SELECT TRUE, resulting_points, NULL::TEXT, inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_point_transaction(UUID, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_point_transaction(UUID, INTEGER, TEXT, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.harvest_pins(
  p_user_id UUID,
  p_pin_ids UUID[],
  p_mode TEXT,
  p_hourly_percent INTEGER,
  p_max_hours INTEGER,
  p_remote_percent INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  granted INTEGER,
  harvest_total INTEGER,
  pin_count INTEGER,
  new_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_hour TIMESTAMPTZ := to_timestamp(public.pin_harvest_hour_index(NOW()) * 3600);
  v_total BIGINT := 0;
  v_count INTEGER := 0;
  v_locked INTEGER := 0;
  v_ids UUID[] := ARRAY[]::UUID[];
  v_amount INTEGER;
  v_granted INTEGER;
  v_points INTEGER;
  v_type TEXT;
  v_description TEXT;
  v_related_id UUID;
  r RECORD;
BEGIN
  IF p_mode NOT IN ('direct', 'remote') THEN
    RETURN QUERY SELECT FALSE, 'invalid_mode'::TEXT, 0, 0, 0, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_mode = 'direct'
    AND (p_pin_ids IS NULL OR cardinality(p_pin_ids) <> 1) THEN
    RETURN QUERY SELECT FALSE, 'invalid_mode'::TEXT, 0, 0, 0, NULL::INTEGER;
    RETURN;
  END IF;

  FOR r IN
    SELECT pi.id, pi.cost, pi.harvest_stored, pi.harvest_settled_at
    FROM public.pins pi
    WHERE pi.user_id = p_user_id
      AND pi.status = 'active'
      AND (p_pin_ids IS NULL OR pi.id = ANY(p_pin_ids))
    ORDER BY pi.id
    FOR UPDATE
  LOOP
    v_locked := v_locked + 1;
    v_amount := public.pin_harvest_amount(
      r.cost,
      r.harvest_stored,
      r.harvest_settled_at,
      v_now,
      p_hourly_percent,
      p_max_hours
    );
    IF v_amount > 0 THEN
      v_total := v_total + v_amount;
      v_count := v_count + 1;
      v_ids := array_append(v_ids, r.id);
    END IF;
  END LOOP;

  IF v_locked = 0 THEN
    RETURN QUERY SELECT FALSE, 'pin_not_found'::TEXT, 0, 0, 0, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_mode = 'direct' THEN
    v_granted := v_total::INTEGER;
  ELSE
    v_granted := (v_total * p_remote_percent / 100)::INTEGER;
  END IF;

  IF v_granted <= 0 THEN
    RETURN QUERY SELECT FALSE, 'nothing_to_harvest'::TEXT, 0, v_total::INTEGER, v_count, NULL::INTEGER;
    RETURN;
  END IF;

  UPDATE public.pins
  SET
    harvest_stored = 0,
    harvest_settled_at = v_hour
  WHERE id = ANY(v_ids);

  UPDATE public.profiles
  SET
    points = points + v_granted,
    updated_at = v_now
  WHERE id = p_user_id
  RETURNING points INTO v_points;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_mode = 'direct' THEN
    v_type := 'harvest_direct';
    v_description := '깃발 1개 · 쌓인 ' || to_char(v_total, 'FM999,999,999') || 'P 모두';
  ELSE
    v_type := 'harvest_remote';
    v_description := '깃발 ' || v_count || '개 · 쌓인 '
      || to_char(v_total, 'FM999,999,999') || 'P 중 ' || p_remote_percent || '%';
  END IF;

  IF p_pin_ids IS NOT NULL AND cardinality(p_pin_ids) = 1 THEN
    v_related_id := p_pin_ids[1];
  END IF;

  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    description,
    related_id
  )
  VALUES (
    p_user_id,
    v_granted,
    v_type,
    v_description,
    v_related_id
  );

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_granted, v_total::INTEGER, v_count, v_points;
END;
$$;

REVOKE ALL ON FUNCTION public.harvest_pins(UUID, UUID[], TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.harvest_pins(UUID, UUID[], TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.reinforce_pin_with_harvest(
  p_pin_id UUID,
  p_user_id UUID,
  p_next_cost INTEGER,
  p_text TEXT,
  p_hourly_percent INTEGER,
  p_max_hours INTEGER
)
RETURNS SETOF public.pins
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pins
  SET
    harvest_stored = public.pin_harvest_amount(
      cost,
      harvest_stored,
      harvest_settled_at,
      NOW(),
      p_hourly_percent,
      p_max_hours
    ),
    harvest_settled_at = to_timestamp(public.pin_harvest_hour_index(NOW()) * 3600),
    cost = p_next_cost,
    text = p_text,
    last_reinforced_at = NOW(),
    updated_at = NOW()
  WHERE id = p_pin_id
    AND status = 'active'
    AND user_id = p_user_id
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.reinforce_pin_with_harvest(UUID, UUID, INTEGER, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reinforce_pin_with_harvest(UUID, UUID, INTEGER, TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.conquer_pin_with_harvest(
  p_target_pin_id UUID,
  p_attacker_id UUID,
  p_text TEXT,
  p_radius_meters INTEGER,
  p_hourly_percent INTEGER,
  p_max_hours INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  harvest_transferred INTEGER,
  new_pin JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_hour TIMESTAMPTZ := to_timestamp(public.pin_harvest_hour_index(NOW()) * 3600);
  v_target public.pins%ROWTYPE;
  v_new public.pins%ROWTYPE;
  v_amount INTEGER;
BEGIN
  SELECT *
  INTO v_target
  FROM public.pins
  WHERE id = p_target_pin_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'pin_not_found'::TEXT, 0, NULL::JSONB;
    RETURN;
  END IF;

  IF v_target.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, 'already_conquered'::TEXT, 0, NULL::JSONB;
    RETURN;
  END IF;

  v_amount := public.pin_harvest_amount(
    v_target.cost,
    v_target.harvest_stored,
    v_target.harvest_settled_at,
    v_now,
    p_hourly_percent,
    p_max_hours
  );

  UPDATE public.pins
  SET
    status = 'conquered',
    conquered_by = p_attacker_id,
    conquered_at = v_now,
    updated_at = v_now,
    harvest_stored = 0,
    harvest_settled_at = v_hour
  WHERE id = p_target_pin_id;

  INSERT INTO public.pins (
    user_id,
    text,
    lat,
    lng,
    radius_meters,
    status,
    cost,
    expires_at,
    last_reinforced_at,
    harvest_stored,
    harvest_settled_at
  )
  VALUES (
    p_attacker_id,
    p_text,
    v_target.lat,
    v_target.lng,
    p_radius_meters,
    'active',
    v_target.cost,
    NULL,
    NULL,
    v_amount,
    v_hour
  )
  RETURNING * INTO v_new;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_amount, to_jsonb(v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.conquer_pin_with_harvest(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conquer_pin_with_harvest(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

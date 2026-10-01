-- 일간·주간·월간·시작하기 미션 보상

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
    'mission_reward'
  ));

CREATE TABLE IF NOT EXISTS public.mission_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mission_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_mission_claims_user_created
  ON public.mission_claims (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_type_created
  ON public.point_transactions (user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_attacker_created
  ON public.pin_attempts (attacker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_random_points_user_created
  ON public.random_points (user_id, created_at DESC);

ALTER TABLE public.mission_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mission_claims_select_own" ON public.mission_claims;
CREATE POLICY "mission_claims_select_own"
  ON public.mission_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  target_user_id UUID,
  target_mission_id TEXT,
  target_period_key TEXT,
  target_reward_points INTEGER,
  target_description TEXT
)
RETURNS TABLE (
  claimed BOOLEAN,
  new_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_claim_id UUID;
  resulting_points INTEGER;
BEGIN
  IF target_reward_points <= 0 THEN
    RAISE EXCEPTION 'Mission reward must be positive';
  END IF;

  INSERT INTO public.mission_claims (
    user_id,
    mission_id,
    period_key,
    reward_points
  )
  VALUES (
    target_user_id,
    target_mission_id,
    target_period_key,
    target_reward_points
  )
  ON CONFLICT (user_id, mission_id, period_key) DO NOTHING
  RETURNING id INTO inserted_claim_id;

  IF inserted_claim_id IS NULL THEN
    SELECT p.points
      INTO resulting_points
      FROM public.profiles p
      WHERE p.id = target_user_id;

    RETURN QUERY SELECT FALSE, resulting_points;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    points = points + target_reward_points,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING points INTO resulting_points;

  IF resulting_points IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    description
  )
  VALUES (
    target_user_id,
    target_reward_points,
    'mission_reward',
    target_description
  );

  RETURN QUERY SELECT TRUE, resulting_points;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mission_reward(
  UUID,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(
  UUID,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
) TO service_role;

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
            AND pt.type NOT IN ('admin_adjust', 'mission_reward')
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
            AND pt.type NOT IN ('admin_adjust', 'mission_reward')
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
        AND pt.type NOT IN ('admin_adjust', 'mission_reward')
    ), 0),
    COALESCE((
      SELECT COUNT(*)::BIGINT
      FROM point_transactions pt
      WHERE pt.user_id = target_user_id
        AND pt.amount > 0
        AND pt.type NOT IN ('admin_adjust', 'mission_reward')
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
        WHEN 'reinforce_pin' THEN '깃발 강화'
        WHEN 'update_pin_text' THEN '깃발 문구 변경'
        WHEN 'random_point_claim' THEN '포인트 획득'
        WHEN 'pin_toll' THEN '통행료'
        WHEN 'daily_bonus' THEN '출석 보너스'
        WHEN 'defense_reward' THEN '방어 성공'
        WHEN 'signup_bonus' THEN '가입 보너스'
        WHEN 'crew_create' THEN '크루 생성'
        WHEN 'mission_reward' THEN '미션 보상'
        ELSE '포인트 변동'
      END AS title,
      pt.description AS description,
      pt.amount::BIGINT AS amount,
      pt.created_at AS created_at
    FROM point_transactions pt
    WHERE pt.user_id = target_user_id
      AND pt.type != 'conquer_attempt'

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

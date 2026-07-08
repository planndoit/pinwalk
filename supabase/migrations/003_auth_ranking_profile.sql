-- 회원 아이디, 프로필 사진, 랭킹/타임라인 인덱스
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS avatar_data BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_mime TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_registered_unique
  ON public.profiles (lower(nickname))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
  ON public.point_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pins_user_created
  ON public.pins (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_attacker_created
  ON public.pin_attempts (attacker_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  nickname_val TEXT;
BEGIN
  username_val := lower(trim(NEW.raw_user_meta_data->>'username'));
  nickname_val := trim(NEW.raw_user_meta_data->>'nickname');

  IF nickname_val IS NULL OR nickname_val = '' THEN
    nickname_val := '익명의 워커';
  END IF;

  INSERT INTO public.profiles (id, username, nickname, points)
  VALUES (NEW.id, NULLIF(username_val, ''), nickname_val, 1000);

  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1000, 'signup_bonus', '가입 보너스');

  RETURN NEW;
END;
$$;

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
            AND pi.expires_at > NOW()
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
        AND pi.expires_at > NOW()
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

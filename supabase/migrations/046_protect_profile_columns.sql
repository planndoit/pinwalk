-- authenticated 세션으로 points 등 보호 컬럼을 직접 바꾸지 못하게 한다.
-- service_role / SECURITY DEFINER 경로의 서버 갱신은 허용한다.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.username := OLD.username;
  NEW.points := OLD.points;
  NEW.last_random_point_spawn_at := OLD.last_random_point_spawn_at;
  NEW.last_daily_bonus_at := OLD.last_daily_bonus_at;
  NEW.last_seen_at := OLD.last_seen_at;
  NEW.region_visits_backfilled_at := OLD.region_visits_backfilled_at;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- 동일 사용자·쿠폰의 active 스폰 중복 정리 후 유니크 인덱스
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, coupon_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.premium_coupon_spawns
  WHERE status = 'active'
)
UPDATE public.premium_coupon_spawns AS spawns
SET status = 'expired'
FROM ranked
WHERE spawns.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS premium_coupon_spawns_active_user_coupon_unique
  ON public.premium_coupon_spawns (user_id, coupon_id)
  WHERE status = 'active';

-- 프리미엄 장소 광고 성과 이벤트 로그
CREATE TABLE IF NOT EXISTS public.premium_place_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_place_id UUID NOT NULL REFERENCES public.premium_places(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'marker_click',
      'detail_open',
      'phone_click',
      'link_click',
      'coupon_issue',
      'coupon_spawn_click',
      'coupon_claim',
      'coupon_use',
      'view_from_coupons'
    )),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_place_events_place_type_created
  ON public.premium_place_events(premium_place_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_premium_place_events_created
  ON public.premium_place_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_premium_place_events_type_created
  ON public.premium_place_events(event_type, created_at DESC);

ALTER TABLE public.premium_place_events ENABLE ROW LEVEL SECURITY;

-- 집계 RPC (관리자 API에서 service_role로 호출)
CREATE OR REPLACE FUNCTION public.aggregate_premium_place_events(
  p_place_id UUID DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  premium_place_id UUID,
  event_type TEXT,
  event_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.premium_place_id,
    e.event_type,
    COUNT(*)::BIGINT AS event_count
  FROM public.premium_place_events e
  WHERE (p_place_id IS NULL OR e.premium_place_id = p_place_id)
    AND (p_since IS NULL OR e.created_at >= p_since)
    AND (p_until IS NULL OR e.created_at < p_until)
  GROUP BY e.premium_place_id, e.event_type;
$$;

CREATE OR REPLACE FUNCTION public.premium_place_events_daily(
  p_place_id UUID DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  day_date DATE,
  event_type TEXT,
  event_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (e.created_at AT TIME ZONE 'Asia/Seoul')::DATE AS day_date,
    e.event_type,
    COUNT(*)::BIGINT AS event_count
  FROM public.premium_place_events e
  WHERE (p_place_id IS NULL OR e.premium_place_id = p_place_id)
    AND (p_since IS NULL OR e.created_at >= p_since)
    AND (p_until IS NULL OR e.created_at < p_until)
  GROUP BY day_date, e.event_type
  ORDER BY day_date ASC;
$$;

REVOKE ALL ON FUNCTION public.aggregate_premium_place_events(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.premium_place_events_daily(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_premium_place_events(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.premium_place_events_daily(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

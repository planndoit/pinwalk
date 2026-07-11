-- 관리자 대시보드용 집계 (type/description 기준 출석·포인트 획득 건수)
CREATE OR REPLACE FUNCTION public.count_daily_bonus_txs()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.point_transactions
  WHERE type = 'daily_bonus'
     OR description = '매일 출석 보너스'
     OR description ILIKE '%출석%';
$$;

CREATE OR REPLACE FUNCTION public.count_positive_point_txs(
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.point_transactions
  WHERE amount > 0
    AND (p_since IS NULL OR created_at >= p_since);
$$;

REVOKE ALL ON FUNCTION public.count_daily_bonus_txs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_positive_point_txs(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_daily_bonus_txs() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_positive_point_txs(TIMESTAMPTZ) TO service_role;

-- 서버(service_role)에서만 호출하는 RPC: anon/authenticated 직접 호출 차단

REVOKE ALL ON FUNCTION public.claim_mission_reward(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_region_visit(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_region_visit(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_common_code_result(UUID, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_common_codes(TEXT, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_common_codes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_daily_bonus_txs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_positive_point_txs(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aggregate_premium_place_events(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.premium_place_events_daily(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ranking(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_stats(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_timeline(UUID, INT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pin_attempt_history(UUID, INT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pin_attempt_summary(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_region_visit(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_region_visit(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_common_code_result(UUID, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_common_codes(TEXT, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_common_codes() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_daily_bonus_txs() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_positive_point_txs(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_premium_place_events(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.premium_place_events_daily(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ranking(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_timeline(UUID, INT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pin_attempt_history(UUID, INT, TIMESTAMPTZ, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pin_attempt_summary(UUID) TO service_role;

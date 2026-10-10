-- 포인트 잔액 변경 + 거래 기록을 한 트랜잭션에서 처리

CREATE OR REPLACE FUNCTION public.apply_point_transaction(
  target_user_id UUID,
  target_amount INTEGER,
  target_type TEXT,
  target_description TEXT,
  target_related_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_points INTEGER,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resulting_points INTEGER;
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
      RETURN QUERY SELECT FALSE, NULL::INTEGER, 'insufficient_points'::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, NULL::INTEGER, 'profile_not_found'::TEXT;
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
  );

  RETURN QUERY SELECT TRUE, resulting_points, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_point_transaction(
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_point_transaction(
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  UUID
) TO service_role;

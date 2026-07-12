-- 관리자 공통코드 쓰기: RLS SELECT(is_active) 때문에
-- update().select().single() 이 실패하는 문제를 피한다.

CREATE OR REPLACE FUNCTION public.admin_upsert_common_code_result(
  p_id UUID,
  p_group_code TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_mode TEXT DEFAULT 'update'
)
RETURNS TABLE (
  id UUID,
  group_code TEXT,
  code TEXT,
  name TEXT,
  sort_order INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.common_codes%ROWTYPE;
  next_sort INTEGER;
BEGIN
  IF p_mode = 'insert' THEN
    IF p_group_code IS NULL OR p_code IS NULL OR p_name IS NULL THEN
      RAISE EXCEPTION 'group_code, code, name are required';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.common_codes c
      WHERE c.group_code = p_group_code AND c.code = upper(trim(p_code))
    ) THEN
      RAISE EXCEPTION 'duplicate code';
    END IF;

    IF p_sort_order IS NULL THEN
      SELECT COALESCE(MAX(c.sort_order), 0) + 1 INTO next_sort
      FROM public.common_codes c
      WHERE c.group_code = p_group_code;
    ELSE
      next_sort := p_sort_order;
    END IF;

    INSERT INTO public.common_codes (
      group_code, code, name, sort_order, is_active
    ) VALUES (
      p_group_code,
      upper(trim(p_code)),
      trim(p_name),
      next_sort,
      COALESCE(p_is_active, TRUE)
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.common_codes c
    SET
      name = COALESCE(trim(p_name), c.name),
      sort_order = COALESCE(p_sort_order, c.sort_order),
      is_active = COALESCE(p_is_active, c.is_active),
      updated_at = NOW()
    WHERE c.id = p_id
    RETURNING * INTO result;

    IF result.id IS NULL THEN
      RAISE EXCEPTION 'common code not found';
    END IF;
  END IF;

  id := result.id;
  group_code := result.group_code;
  code := result.code;
  name := result.name;
  sort_order := result.sort_order;
  is_active := result.is_active;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_common_codes(
  p_group_code TEXT,
  p_ordered_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
BEGIN
  IF p_group_code IS NULL OR p_ordered_ids IS NULL THEN
    RAISE EXCEPTION 'invalid reorder payload';
  END IF;

  FOR i IN 1 .. coalesce(array_length(p_ordered_ids, 1), 0) LOOP
    UPDATE public.common_codes
    SET sort_order = i, updated_at = NOW()
    WHERE id = p_ordered_ids[i]
      AND group_code = p_group_code;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_common_codes()
RETURNS TABLE (
  id UUID,
  group_code TEXT,
  code TEXT,
  name TEXT,
  sort_order INTEGER,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.group_code, c.code, c.name, c.sort_order, c.is_active
  FROM public.common_codes c
  ORDER BY c.group_code ASC, c.sort_order ASC, c.code ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_common_code_result(UUID, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reorder_common_codes(TEXT, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_common_codes() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_upsert_common_code_result(UUID, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_common_codes(TEXT, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_common_codes() TO service_role;

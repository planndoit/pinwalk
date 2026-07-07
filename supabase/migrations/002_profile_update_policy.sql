-- 닉네임 변경 API가 로그인 사용자 세션으로 UPDATE 할 수 있도록 정책을 명확히 한다.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

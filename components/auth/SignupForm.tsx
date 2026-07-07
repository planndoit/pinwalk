"use client";

import { useState } from "react";
import { normalizeUsername, usernameToAuthEmail } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";

interface SignupFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSuccess: () => void;
}

export default function SignupForm({
  loading,
  setLoading,
  onSuccess,
}: SignupFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        passwordConfirm,
        nickname,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "회원가입에 실패했습니다.");
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(normalizeUsername(username)),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("회원가입은 완료됐지만 로그인에 실패했습니다. 로그인을 시도해주세요.");
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="아이디 (영문 소문자, 숫자, _)"
        autoComplete="username"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호 (6자 이상)"
        autoComplete="new-password"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        placeholder="비밀번호 확인"
        autoComplete="new-password"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value.slice(0, 20))}
        placeholder="닉네임"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={
          loading ||
          !username.trim() ||
          !password ||
          !passwordConfirm ||
          !nickname.trim()
        }
        className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40"
      >
        {loading ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}

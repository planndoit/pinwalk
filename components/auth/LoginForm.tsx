"use client";

import { useState } from "react";
import { normalizeUsername, usernameToAuthEmail } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSuccess: () => void;
}

export default function LoginForm({
  loading,
  setLoading,
  onSuccess,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalized = normalizeUsername(username);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(normalized),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
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
        placeholder="아이디"
        autoComplete="username"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username.trim() || !password}
        className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

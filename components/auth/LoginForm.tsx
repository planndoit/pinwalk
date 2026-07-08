"use client";

import { useEffect, useState } from "react";
import { establishSession } from "@/lib/auth/establishSession";
import { createClient } from "@/lib/supabase/client";
import { REMEMBERED_USERNAME_KEY } from "@/lib/auth/constants";

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
  const [rememberUsername, setRememberUsername] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      setRememberUsername(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      if (rememberUsername) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      const supabase = createClient();
      await establishSession(supabase, data.session);
      onSuccess();
    } catch {
      setError("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="아이디"
        autoComplete="username"
        disabled={loading}
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
        disabled={loading}
        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      />
      <label className="flex items-center gap-2 px-1 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rememberUsername}
          onChange={(e) => setRememberUsername(e.target.checked)}
          disabled={loading}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
        />
        아이디 저장
      </label>
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

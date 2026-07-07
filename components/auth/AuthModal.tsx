"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

interface AuthModalProps {
  open: boolean;
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: "login" | "signup") => void;
}

export default function AuthModal({
  open,
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-fade-in max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm
            loading={loading}
            setLoading={setLoading}
            onSuccess={onSuccess}
          />
        ) : (
          <SignupForm
            loading={loading}
            setLoading={setLoading}
            onSuccess={onSuccess}
          />
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={() => onSwitchMode("signup")}
                className="text-blue-600 font-semibold"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => onSwitchMode("login")}
                className="text-blue-600 font-semibold"
              >
                로그인
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

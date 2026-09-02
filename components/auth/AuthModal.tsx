"use client";

import { useEffect, useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import type { AuthSuccessPayload } from "@/types/authClient";
import OverlayPortal from "@/components/layout/OverlayPortal";

interface AuthModalProps {
  open: boolean;
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: (payload?: AuthSuccessPayload) => void | Promise<void>;
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

  useEffect(() => {
    if (!open) {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("auth-modal-open");
    return () => {
      document.body.classList.remove("auth-modal-open");
    };
  }, [open]);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pb-overlay-safe sm:pb-0">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={loading ? undefined : onClose}
        />
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up sm:animate-fade-in max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-h-[90dvh] flex flex-col min-h-0">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {mode === "login" ? "로그인" : "회원가입"}
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-40"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 min-h-0">
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
          </div>

          <p className="text-center text-sm text-gray-500 px-6 pt-3 pb-5 shrink-0 border-t border-gray-100">
            {mode === "login" ? (
              <>
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => onSwitchMode("signup")}
                  disabled={loading}
                  className="text-blue-600 font-semibold disabled:opacity-40"
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
                  disabled={loading}
                  className="text-blue-600 font-semibold disabled:opacity-40"
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </OverlayPortal>
  );
}

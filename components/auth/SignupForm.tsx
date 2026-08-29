"use client";

import { useMemo, useState } from "react";
import { establishSession } from "@/lib/auth/establishSession";
import { hasActiveSupabaseSession } from "@/lib/auth/hasActiveSupabaseSession";
import {
  getLocationConsentDocument,
  getLocationTermsDocument,
  LOCATION_LEGAL_VERSION,
} from "@/lib/legal/locationLegal";
import { createClient } from "@/lib/supabase/client";
import LegalDocumentModal from "@/components/legal/LegalDocumentModal";
import type { LegalDocument } from "@/lib/legal/locationLegal";

interface SignupFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSuccess: () => void | Promise<void>;
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
  const [confirmOver14, setConfirmOver14] = useState(false);
  const [agreeLocationTerms, setAgreeLocationTerms] = useState(false);
  const [agreeLocationCollection, setAgreeLocationCollection] = useState(false);
  const [error, setError] = useState("");
  const [viewingDocument, setViewingDocument] = useState<LegalDocument | null>(
    null
  );

  const locationTerms = useMemo(() => getLocationTermsDocument(), []);
  const locationConsent = useMemo(() => getLocationConsentDocument(), []);

  const consentsReady =
    confirmOver14 && agreeLocationTerms && agreeLocationCollection;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          passwordConfirm,
          nickname,
          confirmOver14,
          agreeLocationTerms,
          agreeLocationCollection,
          legalVersion: LOCATION_LEGAL_VERSION,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      await establishSession(supabase, data.session);
      await onSuccess();
    } catch {
      const supabase = createClient();
      if (await hasActiveSupabaseSession(supabase)) {
        await onSuccess();
        return;
      }
      setError("회원가입 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디 (영문 소문자, 숫자, _)"
          autoComplete="username"
          disabled={loading}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          autoComplete="new-password"
          disabled={loading}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          disabled={loading}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder="닉네임"
          disabled={loading}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 space-y-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmOver14}
              onChange={(e) => setConfirmOver14(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800 leading-snug">
              <span className="text-red-500 font-semibold">[필수]</span> 만 14세
              이상입니다
            </span>
          </label>

          <div className="flex items-start gap-2.5">
            <input
              id="agree-location-terms"
              type="checkbox"
              checked={agreeLocationTerms}
              onChange={(e) => setAgreeLocationTerms(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-sm text-gray-800 leading-snug flex-1">
              <label htmlFor="agree-location-terms" className="cursor-pointer">
                <span className="text-red-500 font-semibold">[필수]</span>{" "}
                위치기반서비스 이용약관 동의
              </label>
              <button
                type="button"
                onClick={() => setViewingDocument(locationTerms)}
                disabled={loading}
                className="ml-1.5 text-blue-600 font-semibold underline-offset-2 hover:underline disabled:opacity-40"
              >
                보기
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <input
              id="agree-location-collection"
              type="checkbox"
              checked={agreeLocationCollection}
              onChange={(e) => setAgreeLocationCollection(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-sm text-gray-800 leading-snug flex-1">
              <label
                htmlFor="agree-location-collection"
                className="cursor-pointer"
              >
                <span className="text-red-500 font-semibold">[필수]</span>{" "}
                개인위치정보 수집·이용 동의
              </label>
              <button
                type="button"
                onClick={() => setViewingDocument(locationConsent)}
                disabled={loading}
                className="ml-1.5 text-blue-600 font-semibold underline-offset-2 hover:underline disabled:opacity-40"
              >
                보기
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={
            loading ||
            !username.trim() ||
            !password ||
            !passwordConfirm ||
            !nickname.trim() ||
            !consentsReady
          }
          className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <LegalDocumentModal
        open={viewingDocument != null}
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
      />
    </>
  );
}

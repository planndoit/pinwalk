"use client";

import { useState } from "react";

interface PremiumPromotionLocationPickerProps {
  pickedAddress: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onSearchAddress: (query: string) => Promise<void>;
  canConfirm: boolean;
}

export default function PremiumPromotionLocationPicker({
  pickedAddress,
  onCancel,
  onConfirm,
  onSearchAddress,
  canConfirm,
}: PremiumPromotionLocationPickerProps) {
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!addressQuery.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      await onSearchAddress(addressQuery.trim());
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "주소 검색 중 오류가 발생했습니다."
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-24 z-50 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto space-y-2">
          <p className="text-center text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full py-2.5 px-4 shadow-md">
            지도를 탭하거나 도로명 주소를 입력하세요
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-3 flex gap-2">
            <input
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="도로명 주소 검색"
              disabled={searching}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching || !addressQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50 shrink-0"
            >
              {searching ? "검색 중" : "검색"}
            </button>
          </div>
          {searchError && (
            <p className="text-center text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl py-2 px-3">
              {searchError}
            </p>
          )}
          {pickedAddress && (
            <p className="text-center text-xs text-amber-700 bg-white border border-amber-100 rounded-xl py-2 px-3">
              {pickedAddress}
            </p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-[1.4] py-3 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
          >
            이 위치로 계속
          </button>
        </div>
      </div>
    </>
  );
}

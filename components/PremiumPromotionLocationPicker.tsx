"use client";

interface PremiumPromotionLocationPickerProps {
  onCancel: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
}

export default function PremiumPromotionLocationPicker({
  onCancel,
  onConfirm,
  canConfirm,
}: PremiumPromotionLocationPickerProps) {
  return (
    <>
      <div className="fixed inset-x-0 top-24 z-50 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <p className="text-center text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full py-2.5 px-4 shadow-md">
            지도를 탭해 가게 위치를 선택하세요
          </p>
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
            이 위치로 선택
          </button>
        </div>
      </div>
    </>
  );
}

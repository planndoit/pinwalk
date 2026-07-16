"use client";

interface PinLocationPickerProps {
  onCancel: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  loading?: boolean;
}

export default function PinLocationPicker({
  onCancel,
  onConfirm,
  canConfirm,
  loading,
}: PinLocationPickerProps) {
  return (
    <>
      <div className="fixed inset-x-0 top-24 z-50 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <p className="text-center text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-full py-2.5 px-4 shadow-md">
            파란 원 안에서 깃발 위치를 선택하세요
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            className="flex-[1.4] py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {loading ? "확인 중..." : "이 위치에 꽂기"}
          </button>
        </div>
      </div>
    </>
  );
}

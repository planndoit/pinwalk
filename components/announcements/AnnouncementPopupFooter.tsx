export default function AnnouncementPopupFooter({
  onClose,
  onHideToday,
  onHideForever,
}: {
  onClose: () => void;
  onHideToday: () => void;
  onHideForever: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold"
      >
        닫기
      </button>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onHideToday}
          className="py-1 text-xs text-gray-500"
        >
          오늘 하루 보지 않기
        </button>
        <button
          type="button"
          onClick={onHideForever}
          className="py-1 text-xs text-gray-500"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
}

const KST_TIME_ZONE = "Asia/Seoul";

const kstPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getKstParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of kstPartsFormatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** ISO 시각 → datetime-local 입력값(YYYY-MM-DDTHH:mm, 한국 시간). */
export function toKstDateTimeLocalValue(iso: string | Date): string {
  const parts = getKstParts(typeof iso === "string" ? new Date(iso) : iso);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** datetime-local 입력값(한국 시간) → 시간대가 포함된 문자열. */
export function kstDateTimeLocalToZoned(value: string): string {
  return `${value}:00+09:00`;
}

/** 한국 시간 고정 표시: YYYY.MM.DD HH:mm */
export function formatKstDateTime(iso: string): string {
  const parts = getKstParts(new Date(iso));
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

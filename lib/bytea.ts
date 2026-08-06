/** PostgREST BYTEA 입출력 헬퍼 */

export function encodeBytea(data: Buffer): string {
  return `\\x${data.toString("hex")}`;
}

export function decodeBytea(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);

  if (typeof data === "string") {
    if (data.startsWith("\\x")) {
      return Buffer.from(data.slice(2), "hex");
    }
    // 잘못 저장된 Buffer JSON 형태 복구 시도
    if (data.startsWith("{") && data.includes('"type":"Buffer"')) {
      try {
        const parsed = JSON.parse(data) as { type?: string; data?: number[] };
        if (parsed.type === "Buffer" && Array.isArray(parsed.data)) {
          return Buffer.from(parsed.data);
        }
      } catch {
        // fall through
      }
    }
    return Buffer.from(data, "base64");
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as { type?: string }).type === "Buffer" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return Buffer.from((data as { data: number[] }).data);
  }

  return null;
}

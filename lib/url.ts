export function toHttpsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }
  return url;
}

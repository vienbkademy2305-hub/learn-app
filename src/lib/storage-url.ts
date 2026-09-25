/**
 * The only place that turns an asset storage key into a URL (ARCHITECTURE §4).
 * Static site: assets are served from <basePath>/assets/<storage_key>.
 */
export function assetUrl(storageKey: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/assets/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

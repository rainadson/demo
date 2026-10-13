export function siteOrigin(): URL | null {
  const value = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  try { return value ? new URL(value) : null; } catch { return null; }
}
export function canonical(path: string): string | undefined {
  const origin=siteOrigin(); return origin ? new URL(path,origin).toString() : undefined;
}

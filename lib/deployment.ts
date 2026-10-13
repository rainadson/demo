export function backendRedirects(value: string | undefined) {
  if (!value?.trim()) return [];
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('BACKEND_URL deve ser uma origem HTTPS, sem credenciais, caminho ou parâmetros.');
  }
  return ['/login', '/crm/:path*', '/cliente/:path*'].map((source) => ({
    source,
    destination: `${url.origin}${source}`,
    permanent: false,
  }));
}

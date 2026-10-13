import type { Metadata } from 'next';
import './globals.css';
import './brand.css';
import type { CSSProperties } from 'react';
import { company, brandColors } from '@/lib/config';
import { siteOrigin } from '@/lib/seo';
const origin=siteOrigin();
export const metadata: Metadata = {
  metadataBase: origin ?? undefined,
  title: { default: company.name, template: '%s | ' + company.name },
  description: company.description,
  icons: { icon: '/brand/alicerce-mark.png' },
  openGraph: { type:'website', locale:'pt_PT', siteName:company.name, title:company.name, description: company.description },
  twitter: { card:'summary', title:company.name, description: company.description },
  robots: { index: Boolean(origin), follow: Boolean(origin) },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema=origin ? { '@context':'https://schema.org', '@type':'Organization', name:company.name, url:origin.toString(), logo:new URL('/brand/alicerce-logo.png',origin).toString(), telephone:company.contacts.phone, email:company.contacts.email } : null;
  const palette = Object.fromEntries(Object.entries(brandColors).map(([key, value]) => ['--brand-' + key, value])) as CSSProperties;
  return <html lang="pt-PT" style={palette}><body><a className="skip-link" href="#conteudo">Saltar para o conteúdo</a><div id="conteudo">{children}</div>{schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}} />}</body></html>;
}

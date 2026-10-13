import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots { const origin=siteOrigin(); return origin ? { rules:{userAgent:'*',allow:'/',disallow:['/crm/','/cliente/','/login','/pedidos-material','/solicitacoes-compras']}, sitemap:new URL('/sitemap.xml',origin).toString() } : { rules:{userAgent:'*',disallow:'/'} }; }

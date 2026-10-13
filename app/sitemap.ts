import type { MetadataRoute } from 'next';
import { services } from '@/lib/content';
import { siteOrigin } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap { const origin=siteOrigin(); if(!origin)return []; const paths=['/','/servicos','/projetos','/sobre','/orcamento','/contactos',...services.map(service=>`/servicos/${service.slug}`)]; return paths.map(path=>({url:new URL(path,origin).toString(),changeFrequency:path==='/'?'weekly':'monthly',priority:path==='/'?1:.7})); }

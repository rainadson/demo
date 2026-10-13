import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageIntro, PublicFooter, PublicHeader, ProjectCta } from '@/components/public-shell';
import { processSteps, services } from '@/lib/content';
export function generateStaticParams() { return services.map(({slug})=>({slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}): Promise<Metadata> { const {slug}=await params; const service=services.find(item=>item.slug===slug); return service ? {title:service.name,description:service.intro} : {}; }
export default async function ServiceDetail({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const service=services.find(item=>item.slug===slug); if(!service) notFound(); return <main><PublicHeader /><PageIntro eyebrow="SERVIÇO" title={service.name} text={service.intro}/><section className="detail-copy"><p>{service.details}</p><h2>Como abordamos o trabalho</h2><ol>{processSteps.map(([n,title,text])=><li key={n}><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol><Link className="button-dark" href="/orcamento">Falar sobre este projeto</Link></section><ProjectCta /><PublicFooter /></main>; }

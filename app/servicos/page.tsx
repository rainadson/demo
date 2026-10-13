import { company } from '@/lib/config';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageIntro, PublicFooter, PublicHeader, ProjectCta } from '@/components/public-shell';
import { services } from '@/lib/content';
export const metadata: Metadata = { title: 'Serviços', description: company.description };
export default function Services() { return <main><PublicHeader /><PageIntro eyebrow="SERVIÇOS" title="Intervenções pensadas como um todo." text="Da renovação de uma divisão à coordenação integral de uma obra, cada solução começa por uma avaliação cuidada."/><section className="service-catalog">{services.map((service,index)=><Link href={`/servicos/${service.slug}`} key={service.slug}><span>{String(index+1).padStart(2,'0')}</span><div><h2>{service.name}</h2><p>{service.intro}</p></div><ArrowUpRight aria-hidden="true" /></Link>)}</section><ProjectCta /><PublicFooter /></main>; }

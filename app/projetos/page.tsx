import { company } from '@/lib/config';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { PageIntro, PublicFooter, PublicHeader, ProjectCta } from '@/components/public-shell';
import { getPublicPortfolio } from '@/lib/portfolio';
export const metadata: Metadata = { title: 'Projetos', description: 'Conheça o portefólio da ' + company.name + ', com informação e imagens autorizadas.' };
export default async function Projects() {
  const portfolio = await getPublicPortfolio();
  return <main><PublicHeader /><PageIntro eyebrow="PROJETOS" title="O trabalho deve falar com verdade." text="Obras documentadas do estado inicial ao resultado final, com imagens autorizadas."/>
    {portfolio.length ? <section className="portfolio-gallery">{portfolio.map((project) => <article key={project.projectId} className="portfolio-project">
      <header><p className="eyebrow">ANTES E DEPOIS</p><h2>{project.name}</h2>{project.description && <p>{project.description}</p>}</header>
      <div className="comparison-grid"><figure><div><Image src={project.beforeUrl} alt={`Antes da obra ${project.name}`} fill sizes="(max-width: 600px) 100vw, 50vw" unoptimized /></div><figcaption>Antes</figcaption></figure><figure><div><Image src={project.afterUrl} alt={`Depois da obra ${project.name}`} fill sizes="(max-width: 600px) 100vw, 50vw" unoptimized /></div><figcaption>Depois</figcaption></figure></div>
    </article>)}</section> : <section className="public-empty"><p className="eyebrow">PORTEFÓLIO EM PREPARAÇÃO</p><h2>Em breve, projetos documentados do início à entrega.</h2><p>Entretanto, podemos conversar sobre o seu espaço e explicar o nosso processo.</p><Link className="button-dark" href="/orcamento">Pedir orçamento</Link></section>}
    <ProjectCta /><PublicFooter /></main>;
}

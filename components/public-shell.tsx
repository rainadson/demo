import Link from 'next/link';
import { Menu, MessageCircle } from 'lucide-react';
import { Brand } from './brand';
import { company, companyWhatsappUrl } from '@/lib/config';

const nav = [['/','Início'],['/servicos','Serviços'],['/projetos','Projetos'],['/sobre','Sobre'],['/contactos','Contactos']] as const;

export function PublicHeader({ overlay = false }: { overlay?: boolean }) {
  return <header className={`site-header ${overlay ? 'site-header-overlay' : ''}`}>
    <Brand /><nav className="desktop-nav" aria-label="Navegação principal">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><Link className="header-cta" href="/orcamento">Pedir orçamento</Link>
    <details className="mobile-nav"><summary aria-label="Abrir menu"><Menu aria-hidden="true" /></summary><nav aria-label="Navegação móvel">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}<Link href="/orcamento">Pedir orçamento</Link></nav></details>
  </header>;
}
export function PublicFooter() {
  const whatsappUrl = companyWhatsappUrl();
  return <><footer className="site-footer"><div><Brand /><p>{company.description}</p></div><nav aria-label="Rodapé"><Link href="/servicos">Serviços</Link><Link href="/projetos">Projetos</Link><Link href="/sobre">Sobre</Link><Link href="/contactos">Contactos</Link><Link href="/privacidade">Privacidade</Link></nav><div><p>Vamos falar do seu projeto.</p><Link className="footer-contact" href="/orcamento">Pedir orçamento</Link>{company.contacts.phone && <p><a href={"tel:" + company.contacts.phone.replace(/\s/g, "")}>{company.contacts.phone}</a></p>}{company.contacts.email && <p><a href={"mailto:" + company.contacts.email}>{company.contacts.email}</a></p>}</div></footer>{whatsappUrl && <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`Falar com a ${company.shortName} pelo WhatsApp`}><MessageCircle aria-hidden="true"/><span>WhatsApp</span></a>}</>;
}
export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p className="lede">{text}</p>}</section>;
}
export function ProjectCta() {
  return <section className="project-cta"><div><p className="eyebrow">O PRÓXIMO PASSO</p><h2>Tem um projeto<br />em mente?</h2></div><div><p>Conte-nos o que pretende transformar.</p><Link className="button-light" href="/orcamento">Pedir orçamento</Link></div></section>;
}

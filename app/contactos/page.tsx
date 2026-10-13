import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro, PublicFooter, PublicHeader } from '@/components/public-shell';
import { company, companyWhatsappUrl } from '@/lib/config';
export const metadata: Metadata = { title: 'Contactos', description: 'Apresente o seu projeto à ' + company.name + '. Vamos compreender as suas necessidades e preparar os próximos passos.' };
export default function Contacts() {
  const whatsappUrl = companyWhatsappUrl();
  return <main><PublicHeader /><PageIntro eyebrow="CONTACTOS" title="O seu projeto começa com uma conversa." text="Conte-nos o que pretende construir ou renovar. O formulário ajuda a reunir a informação para uma primeira análise." /><section className="contact-panel"><div><p className="eyebrow">PEDIDOS DE ORÇAMENTO</p><h2>Partilhe as suas ideias.</h2><p>Indique o tipo de intervenção, o local e as suas prioridades. Pode também juntar fotografias ou plantas.</p><Link className="button-dark" href="/orcamento">Iniciar pedido</Link></div><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Clareza desde o início.</h2><p>Conhecer o espaço e as suas expectativas é o primeiro passo para organizar a intervenção.</p>{company.contacts.phone && <p><a href={'tel:' + company.contacts.phone.replace(/\s/g, '')}>{company.contacts.phone}</a></p>}{company.contacts.email && <p><a href={'mailto:' + company.contacts.email}>{company.contacts.email}</a></p>}{company.contacts.address && <p>{company.contacts.address}</p>}{whatsappUrl && <a className="button-dark" href={whatsappUrl} target="_blank" rel="noreferrer">Falar pelo WhatsApp</a>}</div></section><PublicFooter /></main>;
}

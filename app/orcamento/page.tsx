import { company } from '@/lib/config';
import type { Metadata } from 'next';
import { PublicFooter, PublicHeader } from '@/components/public-shell';
import { QuoteWizard } from '@/features/quote/quote-wizard';
export const metadata: Metadata = { title:'Pedir orçamento', description:'Conte à ' + company.shortName + ' o que pretende construir, remodelar ou renovar.' };
export default function QuotePage(){return <main><PublicHeader /><section className="quote-page"><div className="quote-intro"><p className="eyebrow">PEDIDO DE ORÇAMENTO</p><h1>Comecemos pelo essencial.</h1><p>Responda a algumas perguntas para prepararmos uma primeira análise do projeto.</p></div><QuoteWizard /></section><PublicFooter /></main>}

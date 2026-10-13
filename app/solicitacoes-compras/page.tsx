import type { Metadata } from 'next';
import { PublicFooter, PublicHeader } from '@/components/public-shell';
import { SupplyRequestForm } from '@/features/supply-requests/request-form';

export const metadata: Metadata = {
  title: 'Solicitação de compras',
  description: 'Formulário da equipa para solicitar materiais e ferramentas ao gestor.',
  robots: { index: false, follow: false },
};

export default function PurchaseRequestPage() {
  return <>
    <PublicHeader />
    <main className="supply-page">
      <section className="supply-intro">
        <p className="eyebrow">EQUIPA · SOLICITAÇÕES DE COMPRAS</p>
        <h1>Solicite o que precisa para a obra.</h1>
        <p>Informe o material ou a ferramenta, a quantidade e a data necessária. O gestor recebe a solicitação no CRM para analisar, aprovar e acompanhar.</p>
        <div className="supply-steps"><span>01 <b>Preencha</b></span><span>02 <b>Envie</b></span><span>03 <b>O gestor analisa</b></span></div>
      </section>
      <SupplyRequestForm repeatHref="/solicitacoes-compras" />
    </main>
    <PublicFooter />
  </>;
}

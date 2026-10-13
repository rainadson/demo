import type { Metadata } from 'next';
import { PublicFooter, PublicHeader } from '@/components/public-shell';
import { SupplyRequestForm } from '@/features/supply-requests/request-form';

export const metadata: Metadata = {
  title: 'Pedido de materiais e ferramentas',
  description: 'Formulário interno para funcionários pedirem materiais e ferramentas ao gestor.',
  robots: { index: false, follow: false },
};

export default function SupplyRequestPage() {
  return <>
    <PublicHeader />
    <main className="supply-page">
      <section className="supply-intro">
        <p className="eyebrow">EQUIPA · PEDIDOS INTERNOS</p>
        <h1>Peça o que precisa para a obra.</h1>
        <p>Materiais ou ferramentas: indique o item, a quantidade e quando será necessário. O gestor recebe o pedido para análise.</p>
        <div className="supply-steps"><span>01 <b>Preencha</b></span><span>02 <b>Envie</b></span><span>03 <b>O gestor analisa</b></span></div>
      </section>
      <SupplyRequestForm />
    </main>
    <PublicFooter />
  </>;
}

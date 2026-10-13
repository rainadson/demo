import Link from 'next/link';
import { ArrowLeft, CalendarDays, FileText, Percent } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

export default async function QuoteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requirePermission('quotes');
  const db = await getSupabase();
  if (!db) notFound();
  const { data: quote } = await db
    .from('quotes')
    .select(
      '*,leads(id,name,email,phone),clients(id,name,email,phone),quote_versions(*,quote_items(*))',
    )
    .eq('id', id)
    .eq('company_id', identity.companyId)
    .single();
  if (!quote) notFound();
  const versions = (quote.quote_versions ?? []).sort(
    (a: { version: number }, b: { version: number }) => b.version - a.version,
  );
  const current =
    versions.find(
      (v: { version: number }) => v.version === quote.current_version,
    ) ?? versions[0];
  const person = quote.clients ?? quote.leads;
  const margin =
    Number(current?.net_cents ?? 0) -
    Number(current?.estimated_cost_cents ?? 0);
  return (
    <main className="crm-page">
      <Link className="back-link" href="/crm/orcamentos">
        <ArrowLeft size={16} />
        Voltar aos orçamentos
      </Link>
      <div className="detail-hero">
        <div>
          <p className="eyebrow">ORÇAMENTO {quote.number}</p>
          <h1>{person?.name ?? 'Proposta'}</h1>
          <span>
            Versão {quote.current_version} · criado em{' '}
            {formatDate(quote.created_at)}
          </span>
        </div>
        <StatusBadge status={quote.status} />
      </div>
      <section className="executive-grid compact">
        <article className="executive-metric">
          <span>Valor líquido</span>
          <strong>{formatMoney(Number(current?.net_cents ?? 0))}</strong>
        </article>
        <article className="executive-metric">
          <span>IVA</span>
          <strong>{formatMoney(Number(current?.vat_cents ?? 0))}</strong>
        </article>
        <article className="executive-metric tone-positive">
          <span>Total</span>
          <strong>{formatMoney(Number(current?.total_cents ?? 0))}</strong>
        </article>
        <article className="executive-metric">
          <span>Margem prevista</span>
          <strong>{formatMoney(margin)}</strong>
        </article>
      </section>
      <div className="detail-columns">
        <section className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">ITENS</p>
              <h2>Trabalhos e materiais</h2>
            </div>
            <span>{current?.quote_items?.length ?? 0}</span>
          </div>
          {current?.quote_items?.length ? (
            <div className="crm-table-wrap borderless">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd.</th>
                    <th>Un.</th>
                    <th>Preço</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {current.quote_items.map(
                    (item: {
                      id: string;
                      description: string;
                      quantity: number;
                      unit: string;
                      unit_price_cents: number;
                      total_cents: number;
                    }) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{formatMoney(item.unit_price_cents)}</td>
                        <td>{formatMoney(item.total_cents)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="crm-empty">
              <FileText />
              <p>Esta versão ainda não tem linhas detalhadas.</p>
            </div>
          )}
        </section>
        <aside className="quote-side">
          <section>
            <CalendarDays />
            <div>
              <small>Validade</small>
              <strong>
                {current?.valid_until ? formatDate(current.valid_until) : '—'}
              </strong>
            </div>
          </section>
          <section>
            <Percent />
            <div>
              <small>Margem sobre venda</small>
              <strong>
                {Number(current?.net_cents)
                  ? `${((margin / Number(current.net_cents)) * 100).toFixed(1).replace('.', ',')}%`
                  : '—'}
              </strong>
            </div>
          </section>
          {current?.terms && (
            <div>
              <p className="eyebrow">CONDIÇÕES</p>
              <p>{current.terms}</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

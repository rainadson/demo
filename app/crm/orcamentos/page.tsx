/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import Link from 'next/link';
import { FileText } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createQuote } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

export default async function QuotesPage() {
  const identity = await requirePermission('quotes');
  const db = await getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const [quotesResult, leadsResult, clientsResult] = db
    ? await Promise.all([
        db
          .from('quotes')
          .select(
            'id,number,status,current_version,created_at,leads(name),clients(name),quote_versions(version,valid_until,net_cents,vat_cents,total_cents)',
          )
          .eq('company_id', identity.companyId)
          .order('created_at', { ascending: false })
          .limit(200),
        db
          .from('leads')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .in('status', [
            'QUALIFICADO',
            'VISITA_AGENDADA',
            'VISITA_REALIZADA',
            'ORCAMENTO',
            'PROPOSTA_ENVIADA',
            'NEGOCIACAO',
          ])
          .order('name'),
        db
          .from('clients')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }, { data: [] }];
  const quotes = (quotesResult.data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMERCIAL"
        title="Orçamentos"
        description="Propostas, valores, validade e estado de decisão."
      >
        <CreatePanel
          title="Novo orçamento"
          description="Crie a primeira versão da proposta"
        >
          <form action={createQuote} className="crm-form">
            <div className="form-grid">
              <label>
                Número
                <input
                  name="number"
                  required
                  placeholder={`ORC-${today.replaceAll('-', '')}-001`}
                />
              </label>
              <label>
                Lead
                <select name="lead_id">
                  <option value="">Selecionar</option>
                  {(leadsResult.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cliente
                <select name="client_id">
                  <option value="">Selecionar</option>
                  {(clientsResult.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor líquido (€)
                <input name="net" type="number" min="0" step="0.01" required />
              </label>
              <label>
                IVA (%)
                <input
                  name="vat_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="23"
                  required
                />
              </label>
              <label>
                Válido até
                <input name="valid_until" type="date" required />
              </label>
              <label className="span-2">
                Condições
                <textarea name="terms" rows={3} />
              </label>
            </div>
            <FormActions label="Criar orçamento" />
          </form>
        </CreatePanel>
      </PageHeader>
      {quotesResult.error ? (
        <div className="crm-error">
          Não foi possível carregar os orçamentos.
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Ainda não existem orçamentos."
          description="Crie uma proposta a partir de um lead qualificado ou cliente."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente / lead</th>
                <th>Estado</th>
                <th>Versão</th>
                <th>Validade</th>
                <th>Valor</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const versions =
                  (quote.quote_versions as Record<string, unknown>[]) ?? [];
                const version =
                  versions.find(
                    (v) => Number(v.version) === Number(quote.current_version),
                  ) ?? versions.at(-1);
                return (
                  <tr key={String(quote.id)}>
                    <td>
                      <Link
                        aria-label={`Abrir orçamento ${String(quote.number)}`}
                        href={`/crm/orcamentos/${quote.id}`}
                      >
                        <strong>{String(quote.number)}</strong>
                      </Link>
                    </td>
                    <td>
                      {String(
                        (quote.clients as { name?: string } | null)?.name ??
                          (quote.leads as { name?: string } | null)?.name ??
                          '—',
                      )}
                    </td>
                    <td>
                      <StatusBadge status={String(quote.status)} />
                    </td>
                    <td>v{String(quote.current_version)}</td>
                    <td>
                      {version?.valid_until
                        ? formatDate(String(version.valid_until))
                        : '—'}
                    </td>
                    <td>
                      <strong>
                        {formatMoney(Number(version?.total_cents ?? 0))}
                      </strong>
                    </td>
                    <td>{formatDate(String(quote.created_at))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

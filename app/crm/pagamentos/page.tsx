import { CreditCard } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  Metric,
  PageHeader,
} from '@/components/crm/page-elements';
import { createPayment, createPaymentSchedule, updateStatus } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

const statuses = ['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'];
export default async function PaymentsPage() {
  const identity = await requirePermission('finance');
  const db = await getSupabase();
  const [schedulesResult, projectsResult, clientsResult] = db
    ? await Promise.all([
        db
          .from('payment_schedules')
          .select(
            'id,description,amount_cents,due_on,status,projects(name),clients(name),payments(amount_cents,received_on)',
          )
          .eq('company_id', identity.companyId)
          .order('due_on')
          .limit(500),
        db
          .from('projects')
          .select('id,name,client_id')
          .eq('company_id', identity.companyId)
          .order('name'),
        db
          .from('clients')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }, { data: [] }];
  const schedules = (schedulesResult.data ?? []) as Record<string, unknown>[];
  const contracted = schedules
    .filter((s) => s.status !== 'CANCELADO')
    .reduce((t, s) => t + Number(s.amount_cents), 0);
  const received = schedules.reduce(
    (t, s) =>
      t +
      ((s.payments as { amount_cents: number }[] | null) ?? []).reduce(
        (a, p) => a + Number(p.amount_cents),
        0,
      ),
    0,
  );
  const overdue = schedules
    .filter(
      (s) =>
        s.status === 'ATRASADO' ||
        (s.status === 'PENDENTE' &&
          String(s.due_on) < new Date().toISOString().slice(0, 10)),
    )
    .reduce((t, s) => t + Number(s.amount_cents), 0);
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="FINANCEIRO"
        title="Pagamentos"
        description="Prestações, vencimentos, recebimentos e atrasos."
      >
        <div className="header-actions">
        <CreatePanel title="Registar entrada" description="Confirme dinheiro recebido">
          <form action={createPayment} className="crm-form">
            <div className="form-grid">
              <label className="span-2">Prestação<select name="schedule_id" required><option value="">Selecionar</option>
                {schedules.filter((s) => s.status !== 'PAGO' && s.status !== 'CANCELADO').map((s) => {
                  const paid = ((s.payments as { amount_cents: number }[] | null) ?? []).reduce((total, payment) => total + Number(payment.amount_cents), 0);
                  return <option key={String(s.id)} value={String(s.id)}>{String(s.description)} — {formatMoney(Number(s.amount_cents) - paid)} em aberto</option>;
                })}
              </select></label>
              <label>Valor recebido (€)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
              <label>Data de recebimento<input name="received_on" type="date" required /></label>
              <label>Forma de pagamento<select name="payment_method" defaultValue="TRANSFERENCIA">
                <option value="TRANSFERENCIA">Transferência</option><option value="MBWAY">MB WAY</option>
                <option value="DINHEIRO">Dinheiro</option><option value="CHEQUE">Cheque</option>
                <option value="CARTAO">Cartão</option><option value="OUTRO">Outro</option>
              </select></label>
              <label>Referência<input name="reference" maxLength={160} placeholder="Ex.: FT 2026/014" /></label>
            </div>
            <FormActions label="Registar recebimento" />
          </form>
        </CreatePanel>
        <CreatePanel title="Nova prestação" description="Planeie um recebimento de cliente">
          <form action={createPaymentSchedule} className="crm-form">
            <div className="form-grid">
              <label>
                Obra
                <select name="project_id" required>
                  <option value="">Selecionar</option>
                  {(projectsResult.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cliente
                <select name="client_id" required>
                  <option value="">Selecionar</option>
                  {(clientsResult.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Descrição
                <input
                  name="description"
                  required
                  placeholder="Ex.: Adjudicação — 30%"
                />
              </label>
              <label>
                Valor (€)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Vencimento
                <input name="due_on" type="date" required />
              </label>
            </div>
            <FormActions label="Criar prestação" />
          </form>
        </CreatePanel>
        </div>
      </PageHeader>
      <section className="executive-grid compact">
        <Metric label="Contratado" value={formatMoney(contracted)} />
        <Metric
          label="Recebido"
          value={formatMoney(received)}
          tone="positive"
        />
        <Metric
          label="A receber"
          value={formatMoney(Math.max(0, contracted - received))}
        />
        <Metric
          label="Em atraso"
          value={formatMoney(overdue)}
          tone={overdue ? 'danger' : 'default'}
        />
      </section>
      {schedulesResult.error ? (
        <div className="crm-error">
          Não foi possível carregar os pagamentos.
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sem pagamentos planeados."
          description="Crie as prestações acordadas para cada obra."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Obra</th>
                <th>Valor</th>
                <th>Recebido</th>
                <th>Estado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const paid = (
                  (s.payments as { amount_cents: number }[] | null) ?? []
                ).reduce((t, p) => t + Number(p.amount_cents), 0);
                return (
                  <tr key={String(s.id)}>
                    <td>{formatDate(String(s.due_on))}</td>
                    <td>
                      <strong>{String(s.description)}</strong>
                    </td>
                    <td>
                      {String(
                        (s.clients as { name?: string } | null)?.name ?? '—',
                      )}
                    </td>
                    <td>
                      {String(
                        (s.projects as { name?: string } | null)?.name ?? '—',
                      )}
                    </td>
                    <td>{formatMoney(Number(s.amount_cents))}</td>
                    <td>{formatMoney(paid)}</td>
                    <td>
                      <StatusBadge status={String(s.status)} />
                    </td>
                    <td>
                      <form action={updateStatus} className="table-action">
                        <input type="hidden" name="entity" value="payment" />
                        <input type="hidden" name="id" value={String(s.id)} />
                        <select
                          name="status"
                          aria-label="Novo estado do pagamento"
                          defaultValue={String(s.status)}
                        >
                          {statuses.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                        <button type="submit">Guardar</button>
                      </form>
                    </td>
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

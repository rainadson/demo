/* eslint-disable typescript/no-base-to-string */
import { ShoppingCart } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createPurchase, updateStatus } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

const statuses = [
  'SOLICITADA',
  'APROVADA',
  'COMPRADA',
  'RECEBIDA',
  'CANCELADA',
];
export default async function PurchasesPage() {
  const identity = await requirePermission('purchases');
  const db = await getSupabase();
  const [purchasesResult, projectsResult, suppliersResult] = db
    ? await Promise.all([
        db
          .from('purchases')
          .select(
            'id,status,requested_on,total_cents,notes,projects(name),suppliers(name)',
          )
          .eq('company_id', identity.companyId)
          .order('requested_on', { ascending: false })
          .limit(300),
        db
          .from('projects')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .not('status', 'in', '("CONCLUIDA","ENTREGUE")')
          .order('name'),
        db
          .from('suppliers')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }, { data: [] }];
  const purchases = (purchasesResult.data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMPRAS"
        title="Compras"
        description="Pedidos, aprovações, receção e custos por obra."
      >
        <CreatePanel
          title="Nova compra"
          description="Registe uma necessidade da obra"
        >
          <form action={createPurchase} className="crm-form">
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
                Fornecedor
                <select name="supplier_id">
                  <option value="">Por definir</option>
                  {(suppliersResult.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data
                <input
                  name="requested_on"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label>
                Valor previsto (€)
                <input
                  name="total"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label className="span-2">
                Descrição / itens
                <textarea name="notes" rows={3} />
              </label>
            </div>
            <FormActions label="Criar pedido" />
          </form>
        </CreatePanel>
      </PageHeader>
      {purchasesResult.error ? (
        <div className="crm-error">Não foi possível carregar as compras.</div>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sem compras registadas."
          description="Crie pedidos de compra ligados às obras."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Obra</th>
                <th>Fornecedor</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={String(p.id)}>
                  <td>{formatDate(String(p.requested_on))}</td>
                  <td>
                    <strong>
                      {String(
                        (p.projects as { name?: string } | null)?.name ?? '—',
                      )}
                    </strong>
                  </td>
                  <td>
                    {String(
                      (p.suppliers as { name?: string } | null)?.name ?? '—',
                    )}
                  </td>
                  <td>{String(p.notes ?? '—')}</td>
                  <td>{formatMoney(Number(p.total_cents))}</td>
                  <td>
                    <StatusBadge status={String(p.status)} />
                  </td>
                  <td>
                    <form action={updateStatus} className="table-action">
                      <input type="hidden" name="entity" value="purchase" />
                      <input type="hidden" name="id" value={String(p.id)} />
                      <select
                        name="status"
                        aria-label="Novo estado da compra"
                        defaultValue={String(p.status)}
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <button type="submit">Guardar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

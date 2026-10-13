/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import { Package, Pencil, Trash2 } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createMaterial, deleteMaterial, updateMaterial } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/config';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

const units = ['un', 'm', 'm²', 'm³', 'kg', 'L', 'cx', 'dia', 'hora'];
export default async function MaterialsPage() {
  const identity = await requirePermission('materials');
  const db = await getSupabase();
  const [materialsResult, suppliersResult] = db
    ? await Promise.all([
        db
          .from('materials')
          .select(
            'id,name,category,unit,supplier_id,last_cost_cents,average_cost_cents,active,suppliers(name)',
          )
          .eq('company_id', identity.companyId)
          .order('name'),
        db
          .from('suppliers')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }];
  const materials = (materialsResult.data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMPRAS"
        title="Materiais"
        description="Catálogo de referências, unidades e evolução de custos."
      >
        <CreatePanel
          title="Novo material"
          description="Adicione uma referência ao catálogo"
        >
          <form action={createMaterial} className="crm-form">
            <div className="form-grid">
              <label>
                Nome
                <input name="name" required />
              </label>
              <label>
                Categoria
                <input name="category" />
              </label>
              <label>
                Unidade
                <select name="unit">
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label>
                Último custo (€)
                <input
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label className="span-2">
                Fornecedor
                <select name="supplier_id">
                  <option value="">Sem fornecedor</option>
                  {(suppliersResult.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <FormActions label="Adicionar material" />
          </form>
        </CreatePanel>
      </PageHeader>
      {materialsResult.error ? (
        <div className="crm-error">Não foi possível carregar os materiais.</div>
      ) : materials.length === 0 ? (
        <EmptyState
          icon={Package}
          title="O catálogo está vazio."
          description="Adicione materiais para comparar custos e preparar compras."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Fornecedor</th>
                <th>Último custo</th>
                <th>Custo médio</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={String(m.id)}>
                  <td>
                    <strong>{String(m.name)}</strong>
                  </td>
                  <td>{String(m.category ?? '—')}</td>
                  <td>{String(m.unit)}</td>
                  <td>
                    {String(
                      (m.suppliers as { name?: string } | null)?.name ?? '—',
                    )}
                  </td>
                  <td>{formatMoney(Number(m.last_cost_cents))}</td>
                  <td>{formatMoney(Number(m.average_cost_cents))}</td>
                  <td className="crud-cell"><details className="crud-details"><summary><Pencil size={14} /> Editar</summary><ClosePanelButton />
                    <form action={updateMaterial} className="crm-form"><input type="hidden" name="id" value={String(m.id)} /><div className="form-grid">
                      <label>Nome<input name="name" required defaultValue={String(m.name)} /></label><label>Categoria<input name="category" defaultValue={String(m.category ?? '')} /></label>
                      <label>Unidade<select name="unit" defaultValue={String(m.unit)}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                      <label>Último custo (€)<input name="cost" type="number" min="0" step="0.01" required defaultValue={Number(m.last_cost_cents) / 100} /></label>
                      <label>Fornecedor<select name="supplier_id" defaultValue={String(m.supplier_id ?? '')}><option value="">Sem fornecedor</option>{(suppliersResult.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                      <label>Estado<select name="active" defaultValue={String(m.active)}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
                    </div><FormActions label="Atualizar material" /></form>
                    <form action={deleteMaterial} className="crud-delete"><input type="hidden" name="id" value={String(m.id)} /><button type="submit"><Trash2 size={14} /> Excluir definitivamente</button></form>
                  </details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import { Mail, Pencil, Phone, Trash2, Truck } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createSupplier, deleteSupplier, updateSupplier } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

export default async function SuppliersPage() {
  const identity = await requirePermission('materials');
  const db = await getSupabase();
  const { data, error } = db
    ? await db
        .from('suppliers')
        .select(
          'id,name,tax_id,phone,email,address,category,notes,active,purchases(id,total_cents)',
        )
        .eq('company_id', identity.companyId)
        .order('name')
    : { data: [], error: null };
  const suppliers = (data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMPRAS"
        title="Fornecedores"
        description="Contactos, categorias e histórico de compras."
      >
        <CreatePanel
          title="Novo fornecedor"
          description="Registe uma empresa fornecedora"
        >
          <form action={createSupplier} className="crm-form">
            <div className="form-grid">
              <label>
                Nome
                <input name="name" required />
              </label>
              <label>
                NIF
                <input name="tax_id" />
              </label>
              <label>
                Categoria
                <input name="category" />
              </label>
              <label>
                Telemóvel
                <input name="phone" type="tel" />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label className="span-2">
                Morada
                <input name="address" />
              </label>
              <label className="span-2">
                Notas
                <textarea name="notes" rows={3} />
              </label>
            </div>
            <FormActions label="Criar fornecedor" />
          </form>
        </CreatePanel>
      </PageHeader>
      {error ? (
        <div className="crm-error">
          Não foi possível carregar os fornecedores.
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Ainda não existem fornecedores."
          description="Registe fornecedores para controlar materiais e compras."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>NIF</th>
                <th>Contacto</th>
                <th>Compras</th>
                <th>Morada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={String(s.id)}>
                  <td>
                    <strong>{String(s.name)}</strong>
                  </td>
                  <td>{String(s.category ?? '—')}</td>
                  <td>{String(s.tax_id ?? '—')}</td>
                  <td>
                    <span className="contact-stack">
                      {Boolean(s.phone) && (
                        <small>
                          <Phone size={13} />
                          {String(s.phone)}
                        </small>
                      )}
                      {Boolean(s.email) && (
                        <small>
                          <Mail size={13} />
                          {String(s.email)}
                        </small>
                      )}
                    </span>
                  </td>
                  <td>{Array.isArray(s.purchases) ? s.purchases.length : 0}</td>
                  <td>{String(s.address ?? '—')}</td>
                  <td className="crud-cell"><details className="crud-details"><summary><Pencil size={14} /> Editar</summary><ClosePanelButton />
                    <form action={updateSupplier} className="crm-form"><input type="hidden" name="id" value={String(s.id)} /><div className="form-grid">
                      <label>Nome<input name="name" required defaultValue={String(s.name)} /></label><label>NIF<input name="tax_id" defaultValue={String(s.tax_id ?? '')} /></label>
                      <label>Categoria<input name="category" defaultValue={String(s.category ?? '')} /></label><label>Telemóvel<input name="phone" type="tel" defaultValue={String(s.phone ?? '')} /></label>
                      <label>Email<input name="email" type="email" defaultValue={String(s.email ?? '')} /></label><label>Estado<select name="active" defaultValue={String(s.active)}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
                      <label className="span-2">Morada<input name="address" defaultValue={String(s.address ?? '')} /></label><label className="span-2">Notas<textarea name="notes" rows={3} defaultValue={String(s.notes ?? '')} /></label>
                    </div><FormActions label="Atualizar fornecedor" /></form>
                    <form action={deleteSupplier} className="crud-delete"><input type="hidden" name="id" value={String(s.id)} /><button type="submit"><Trash2 size={14} /> Excluir definitivamente</button></form>
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

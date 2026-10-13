/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import Link from 'next/link';
import { Building, Mail, Phone, Users } from 'lucide-react';
import {
  EmptyState,
  CreatePanel,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createClient } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate } from '@/lib/config';

export default async function ClientsPage() {
  const identity = await requirePermission('clients');
  const db = await getSupabase();
  const { data, error } = db
    ? await db
        .from('clients')
        .select(
          'id,name,kind,nif,phone,email,address,created_at,projects(id),quotes(id)',
        )
        .eq('company_id', identity.companyId)
        .order('name')
        .limit(300)
    : { data: [], error: null };
  const clients = (data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="COMERCIAL"
        title="Clientes"
        description={`${clients.length} clientes registados e respetivo histórico.`}
      >
        <CreatePanel
          title="Novo cliente"
          description="Dados comerciais e de faturação"
        >
          <form action={createClient} className="crm-form">
            <div className="form-grid">
              <label>
                Nome
                <input name="name" required minLength={2} />
              </label>
              <label>
                Tipo
                <select name="kind">
                  <option value="particular">Particular</option>
                  <option value="empresa">Empresa</option>
                </select>
              </label>
              <label>
                NIF
                <input name="nif" inputMode="numeric" />
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
            <FormActions label="Criar cliente" />
          </form>
        </CreatePanel>
      </PageHeader>
      {error ? (
        <div className="crm-error">Não foi possível carregar os clientes.</div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ainda não existem clientes."
          description="Crie o primeiro cliente ou converta um lead ganho."
        />
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Localização</th>
                <th>Obras</th>
                <th>Orçamentos</th>
                <th>Desde</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={String(client.id)}>
                  <td>
                    <Link
                      aria-label={`Abrir cliente ${String(client.name)}`}
                      href={`/crm/clientes/${client.id}`}
                    >
                      <strong>{String(client.name)}</strong>
                      <small className="table-subline">
                        {client.kind === 'empresa' ? (
                          <>
                            <Building size={13} /> Empresa
                          </>
                        ) : (
                          <>
                            <Users size={13} /> Particular
                          </>
                        )}
                      </small>
                    </Link>
                  </td>
                  <td>
                    <span className="contact-stack">
                      {Boolean(client.phone) && (
                        <small>
                          <Phone size={13} />
                          {String(client.phone)}
                        </small>
                      )}
                      {Boolean(client.email) && (
                        <small>
                          <Mail size={13} />
                          {String(client.email)}
                        </small>
                      )}
                    </span>
                  </td>
                  <td>{String(client.address ?? '—')}</td>
                  <td>
                    {Array.isArray(client.projects)
                      ? client.projects.length
                      : 0}
                  </td>
                  <td>
                    {Array.isArray(client.quotes) ? client.quotes.length : 0}
                  </td>
                  <td>{formatDate(String(client.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

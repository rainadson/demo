import { company } from '@/lib/config';
/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import Link from 'next/link';
import { Building2, MapPin } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
  ProgressBar,
} from '@/components/crm/page-elements';
import { createProject, updateStatus } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';

const projectStatuses = [
  'PLANEAMENTO',
  'PREPARACAO',
  'EM_EXECUCAO',
  'PAUSADA',
  'AGUARDANDO_CLIENTE',
  'AGUARDANDO_MATERIAL',
  'CONCLUIDA',
  'ENTREGUE',
];
export default async function ProjectsPage() {
  const identity = await requirePermission('projects');
  const db = await getSupabase();
  const [projectsResult, clientsResult] = db
    ? await Promise.all([
        db
          .from('projects')
          .select(
            'id,name,address,status,progress,starts_on,ends_on,clients(name),project_financials(contracted_cents,estimated_cost_cents),tasks(id,status)',
          )
          .eq('company_id', identity.companyId)
          .order('created_at', { ascending: false })
          .limit(200),
        db
          .from('clients')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }];
  const projects = (projectsResult.data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="OPERAÇÕES"
        title="Obras"
        description="Planeamento, execução, custos, prazos e rentabilidade."
      >
        <CreatePanel
          title="Nova obra"
          description="Inicie o planeamento operacional"
        >
          <form action={createProject} className="crm-form">
            <div className="form-grid">
              <label className="span-2">
                Nome da obra
                <input name="name" required />
              </label>
              <label>
                Cliente
                <select name="client_id" required>
                  <option value="">Selecionar</option>
                  {(clientsResult.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Morada
                <input name="address" />
              </label>
              <label>
                Início
                <input name="starts_on" type="date" />
              </label>
              <label>
                Entrega prevista
                <input name="ends_on" type="date" />
              </label>
              <label>
                Valor contratado (€)
                <input
                  name="contracted"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label>
                Custo previsto (€)
                <input
                  name="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
            <FormActions label="Criar obra" />
          </form>
        </CreatePanel>
      </PageHeader>
      {projectsResult.error ? (
        <div className="crm-error">Não foi possível carregar as obras.</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Ainda não existem obras."
          description="Crie uma obra para acompanhar prazos, equipa, custos e margem."
        />
      ) : (
        <section className="project-grid">
          {projects.map((project) => {
            const financial = Array.isArray(project.project_financials)
              ? project.project_financials[0]
              : (project.project_financials as Record<string, unknown> | null);
            const contracted = Number(financial?.contracted_cents ?? 0);
            const estimated = Number(financial?.estimated_cost_cents ?? 0);
            const tasks = (project.tasks as { status: string }[]) ?? [];
            return (
              <article key={String(project.id)}>
                <Link
                  className="project-card-main"
                  href={`/crm/obras/${project.id}`}
                >
                  <div className="project-card-head">
                    <div>
                      <StatusBadge status={String(project.status)} />
                      <h2>{String(project.name)}</h2>
                      <p>
                        {String(
                          (project.clients as { name?: string } | null)?.name ??
                            'Cliente',
                        )}
                      </p>
                    </div>
                    <span className="project-index">{company.quoteReferencePrefix}</span>
                  </div>
                  {Boolean(project.address) && (
                    <p className="project-location">
                      <MapPin size={14} />
                      {String(project.address)}
                    </p>
                  )}
                  <ProgressBar
                    value={Number(project.progress)}
                    label={
                      project.ends_on
                        ? `Entrega ${formatDate(String(project.ends_on))}`
                        : 'Data por definir'
                    }
                  />
                  <div className="project-card-metrics">
                    <span>
                      <small>Contrato</small>
                      <strong>{formatMoney(contracted)}</strong>
                    </span>
                    <span>
                      <small>Margem prevista</small>
                      <strong>{formatMoney(contracted - estimated)}</strong>
                    </span>
                    <span>
                      <small>Tarefas abertas</small>
                      <strong>
                        {
                          tasks.filter((task) => task.status !== 'CONCLUIDA')
                            .length
                        }
                      </strong>
                    </span>
                  </div>
                </Link>
                <form action={updateStatus} className="inline-status">
                  <input type="hidden" name="entity" value="project" />
                  <input type="hidden" name="id" value={String(project.id)} />
                  <label>
                    Estado
                    <select name="status" defaultValue={String(project.status)}>
                      {projectStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Atualizar</button>
                </form>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

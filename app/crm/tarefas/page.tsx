/* eslint-disable typescript/no-base-to-string, typescript/restrict-template-expressions */
import { ClipboardCheck, Pencil, Trash2 } from 'lucide-react';
import {
  CreatePanel,
  EmptyState,
  FormActions,
  PageHeader,
} from '@/components/crm/page-elements';
import { createTask, deleteTask, updateStatus, updateTask } from '@/features/crm/actions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { formatDate } from '@/lib/config';
import { StatusBadge } from '@/components/status-badge';
import { ClosePanelButton } from '@/components/crm/close-panel-button';

const columns = ['POR_FAZER', 'EM_CURSO', 'BLOQUEADA', 'CONCLUIDA'];
export default async function TasksPage() {
  const identity = await requirePermission('tasks');
  const db = await getSupabase();
  const [tasksResult, projectsResult] = db
    ? await Promise.all([
        db
          .from('tasks')
          .select(
            'id,title,description,status,priority,due_on,projects(id,name)',
          )
          .eq('company_id', identity.companyId)
          .order('due_on', { ascending: true, nullsFirst: false })
          .limit(300),
        db
          .from('projects')
          .select('id,name')
          .eq('company_id', identity.companyId)
          .order('name'),
      ])
    : [{ data: [], error: null }, { data: [] }];
  const tasks = (tasksResult.data ?? []) as Record<string, unknown>[];
  return (
    <main className="crm-page">
      <PageHeader
        eyebrow="OPERAÇÕES"
        title="Tarefas"
        description="Planeamento diário e bloqueios de todas as obras."
      >
        <CreatePanel
          title="Nova tarefa"
          description="Atribua trabalho a uma obra"
        >
          <form action={createTask} className="crm-form">
            <div className="form-grid">
              <label>
                Obra
                <select name="project_id" required>
                  <option value="">Selecionar</option>
                  {(projectsResult.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridade
                <select name="priority">
                  <option>NORMAL</option>
                  <option>ALTA</option>
                  <option>URGENTE</option>
                  <option>BAIXA</option>
                </select>
              </label>
              <label className="span-2">
                Título
                <input name="title" required />
              </label>
              <label className="span-2">
                Descrição
                <textarea name="description" rows={3} />
              </label>
              <label>
                Prazo
                <input name="due_on" type="date" />
              </label>
            </div>
            <FormActions label="Criar tarefa" />
          </form>
        </CreatePanel>
      </PageHeader>
      {tasksResult.error ? (
        <div className="crm-error">Não foi possível carregar as tarefas.</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Sem tarefas registadas."
          description="Crie tarefas para organizar a execução das obras."
        />
      ) : (
        <section className="task-board">
          {columns.map((column) => (
            <div className="task-column" key={column}>
              <header>
                <StatusBadge status={column} />
                <b>{tasks.filter((task) => task.status === column).length}</b>
              </header>
              {tasks
                .filter((task) => task.status === column)
                .map((task) => (
                  <article key={String(task.id)}>
                    <small>
                      {String(
                        (task.projects as { name?: string } | null)?.name ??
                          'Obra',
                      )}
                    </small>
                    <h2>{String(task.title)}</h2>
                    {Boolean(task.description) && (
                      <p>{String(task.description)}</p>
                    )}
                    <footer>
                      <span
                        className={`priority priority-${String(task.priority).toLowerCase()}`}
                      >
                        {String(task.priority)}
                      </span>
                      <time>
                        {task.due_on
                          ? formatDate(String(task.due_on))
                          : 'Sem prazo'}
                      </time>
                    </footer>
                    <form action={updateStatus}>
                      <input type="hidden" name="entity" value="task" />
                      <input type="hidden" name="id" value={String(task.id)} />
                      <select name="status" defaultValue={String(task.status)}>
                        {columns.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <button type="submit">Mover</button>
                    </form>
                    <details className="crud-details"><summary><Pencil size={14} /> Editar</summary><ClosePanelButton />
                      <form action={updateTask} className="crm-form"><input type="hidden" name="id" value={String(task.id)} /><div className="form-grid">
                        <label>Obra<select name="project_id" required defaultValue={String((task.projects as { id?: string } | null)?.id ?? '')}>{(projectsResult.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                        <label>Prioridade<select name="priority" defaultValue={String(task.priority)}><option>BAIXA</option><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select></label>
                        <label className="span-2">Título<input name="title" required defaultValue={String(task.title)} /></label><label className="span-2">Descrição<textarea name="description" rows={3} defaultValue={String(task.description ?? '')} /></label>
                        <label>Prazo<input name="due_on" type="date" defaultValue={String(task.due_on ?? '')} /></label>
                      </div><FormActions label="Atualizar tarefa" /></form>
                      <form action={deleteTask} className="crud-delete"><input type="hidden" name="id" value={String(task.id)} /><button type="submit"><Trash2 size={14} /> Excluir tarefa</button></form>
                    </details>
                  </article>
                ))}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

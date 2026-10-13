'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import type { Resource } from '@/lib/auth/permissions';

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const uuid = z.uuid();
const date = z.iso.date();

function euroCents(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') throw new Error('Valor inválido.');
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000)
    throw new Error('Valor inválido.');
  return Math.round(amount * 100);
}

async function context(resource: Resource) {
  const identity = await requirePermission(resource);
  const db = await getSupabase();
  if (!db) throw new Error('A base de dados não está configurada.');
  return { identity, db };
}

function refresh(...paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

export async function createClient(form: FormData) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      kind: z.enum(['particular', 'empresa']),
      nif: optionalText(30),
      phone: optionalText(40),
      email: z
        .union([z.email().max(254), z.literal('')])
        .transform((v) => v || null),
      address: optionalText(300),
      notes: optionalText(3000),
    })
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('clients');
  const { error } = await db
    .from('clients')
    .insert({ ...input, company_id: identity.companyId });
  if (error) throw new Error('Não foi possível criar o cliente.');
  refresh('/crm/clientes', '/crm');
}

export async function updateClient(form: FormData) {
  const input = z.object({
    id: uuid,
    name: z.string().trim().min(2).max(200),
    kind: z.enum(['particular', 'empresa']),
    nif: optionalText(30),
    phone: optionalText(40),
    email: z.union([z.email().max(254), z.literal('')]).transform((v) => v || null),
    address: optionalText(300),
    notes: optionalText(3000),
  }).parse(Object.fromEntries(form));
  const { identity, db } = await context('clients');
  const { id, ...values } = input;
  const { error } = await db.from('clients').update(values)
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o cliente.');
  refresh('/crm/clientes', `/crm/clientes/${id}`, '/crm');
}

export async function deleteClient(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('clients');
  const { error } = await db.from('clients').delete()
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Este cliente possui histórico associado e não pode ser excluído.');
  refresh('/crm/clientes', '/crm');
  redirect('/crm/clientes');
}

export async function createVisit(form: FormData) {
  const input = z
    .object({
      lead_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      client_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      address: z.string().trim().min(2).max(300),
      starts_at: z.iso.datetime({ local: true }),
      notes: optionalText(3000),
    })
    .refine((v) => v.lead_id || v.client_id)
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('visits');
  const { error } = await db
    .from('visits')
    .insert({
      ...input,
      starts_at: new Date(input.starts_at).toISOString(),
      company_id: identity.companyId,
      assigned_to: identity.id,
    });
  if (error) throw new Error('Não foi possível agendar a visita.');
  refresh('/crm/agenda', '/crm');
}

export async function updateVisit(form: FormData) {
  const input = z.object({
    id: uuid,
    lead_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
    client_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
    address: z.string().trim().min(2).max(300),
    starts_at: z.iso.datetime({ local: true }),
    status: z.enum(['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA']),
    notes: optionalText(3000),
  }).refine((value) => value.lead_id || value.client_id).parse(Object.fromEntries(form));
  const { identity, db } = await context('visits');
  const { id, starts_at, ...values } = input;
  const { error } = await db.from('visits').update({ ...values, starts_at: new Date(starts_at).toISOString() })
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar a visita.');
  refresh('/crm/agenda', '/crm');
}

export async function deleteVisit(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('visits');
  const { error } = await db.from('visits').delete().eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível excluir a visita.');
  refresh('/crm/agenda', '/crm');
}

export async function createQuote(form: FormData) {
  const input = z
    .object({
      lead_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      client_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      number: z.string().trim().min(2).max(40),
      valid_until: date,
      terms: optionalText(5000),
      vat_percent: z.coerce.number().min(0).max(100),
    })
    .refine((v) => v.lead_id || v.client_id)
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('quotes');
  const net = euroCents(form.get('net'));
  const vat = Math.round((net * input.vat_percent) / 100);
  const { data: quote, error } = await db
    .from('quotes')
    .insert({
      company_id: identity.companyId,
      lead_id: input.lead_id,
      client_id: input.client_id,
      number: input.number,
    })
    .select('id')
    .single();
  if (error || !quote) throw new Error('Não foi possível criar o orçamento.');
  const version = await db
    .from('quote_versions')
    .insert({
      company_id: identity.companyId,
      quote_id: quote.id,
      version: 1,
      valid_until: input.valid_until,
      terms: input.terms,
      net_cents: net,
      vat_cents: vat,
      total_cents: net + vat,
      estimated_cost_cents: 0,
      vat_summary: { [String(input.vat_percent)]: vat },
    });
  if (version.error) {
    await db.from('quotes').delete().eq('id', quote.id);
    throw new Error('Não foi possível criar a versão do orçamento.');
  }
  refresh('/crm/orcamentos', '/crm');
}

export async function createProject(form: FormData) {
  const input = z
    .object({
      client_id: uuid,
      name: z.string().trim().min(2).max(200),
      address: optionalText(300),
      starts_on: z.union([date, z.literal('')]).transform((v) => v || null),
      ends_on: z.union([date, z.literal('')]).transform((v) => v || null),
    })
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('projects');
  const contracted = euroCents(form.get('contracted'));
  const estimated = euroCents(form.get('estimated_cost'));
  const { data: project, error } = await db
    .from('projects')
    .insert({
      ...input,
      company_id: identity.companyId,
      manager_id: identity.id,
    })
    .select('id')
    .single();
  if (error || !project) throw new Error('Não foi possível criar a obra.');
  const financial = await db
    .from('project_financials')
    .insert({
      company_id: identity.companyId,
      project_id: project.id,
      contracted_cents: contracted,
      estimated_cost_cents: estimated,
    });
  if (financial.error) {
    await db.from('projects').delete().eq('id', project.id);
    throw new Error('Não foi possível criar os dados financeiros da obra.');
  }
  refresh('/crm/obras', '/crm');
}

export async function updateProject(form: FormData) {
  const input = z.object({
    id: uuid, client_id: uuid, name: z.string().trim().min(2).max(200),
    address: optionalText(300),
    starts_on: z.union([date, z.literal('')]).transform((v) => v || null),
    ends_on: z.union([date, z.literal('')]).transform((v) => v || null),
    progress: z.coerce.number().min(0).max(100),
  }).parse(Object.fromEntries(form));
  const contracted = euroCents(form.get('contracted'));
  const estimated = euroCents(form.get('estimated_cost'));
  const { identity, db } = await context('projects');
  const { id, ...values } = input;
  const { error } = await db.from('projects').update(values).eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar a obra.');
  const financial = await db.from('project_financials').update({ contracted_cents: contracted, estimated_cost_cents: estimated })
    .eq('project_id', id).eq('company_id', identity.companyId);
  if (financial.error) throw new Error('A obra foi atualizada, mas os valores financeiros não foram guardados.');
  refresh('/crm/obras', `/crm/obras/${id}`, '/crm/financeiro', '/crm');
}

export async function deleteProject(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('projects');
  const { error } = await db.from('projects').delete().eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Esta obra possui histórico financeiro ou operacional e não pode ser excluída.');
  refresh('/crm/obras', '/crm');
  redirect('/crm/obras');
}

export async function createTask(form: FormData) {
  const input = z
    .object({
      project_id: uuid,
      title: z.string().trim().min(2).max(240),
      description: optionalText(3000),
      priority: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']),
      due_on: z.union([date, z.literal('')]).transform((v) => v || null),
    })
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('tasks');
  const { error } = await db
    .from('tasks')
    .insert({ ...input, company_id: identity.companyId });
  if (error) throw new Error('Não foi possível criar a tarefa.');
  refresh('/crm/tarefas', '/crm');
}

export async function updateTask(form: FormData) {
  const input = z.object({
    id: uuid, project_id: uuid, title: z.string().trim().min(2).max(240),
    description: optionalText(3000), priority: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']),
    due_on: z.union([date, z.literal('')]).transform((v) => v || null),
  }).parse(Object.fromEntries(form));
  const { identity, db } = await context('tasks');
  const { id, ...values } = input;
  const { error } = await db.from('tasks').update(values).eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar a tarefa.');
  refresh('/crm/tarefas', '/crm');
}

export async function deleteTask(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('tasks');
  const { error } = await db.from('tasks').delete().eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível excluir a tarefa.');
  refresh('/crm/tarefas', '/crm');
}

export async function createWorker(form: FormData) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      kind: z.enum(['COLABORADOR', 'PRESTADOR', 'SUBEMPREITEIRO']),
      specialty: optionalText(160),
      phone: optionalText(40),
      email: z
        .union([z.email().max(254), z.literal('')])
        .transform((v) => v || null),
    })
    .parse(Object.fromEntries(form));
  const hourly = euroCents(form.get('hourly_cost'));
  const { identity, db } = await context('workers');
  const { error } = await db
    .from('workers')
    .insert({
      ...input,
      hourly_cost_cents: hourly,
      company_id: identity.companyId,
    });
  if (error) throw new Error('Não foi possível criar o elemento da equipa.');
  refresh('/crm/equipa');
}

export async function updateWorker(form: FormData) {
  const input = z.object({
    id: uuid,
    name: z.string().trim().min(2).max(200),
    kind: z.enum(['COLABORADOR', 'PRESTADOR', 'SUBEMPREITEIRO']),
    specialty: optionalText(160),
    phone: optionalText(40),
    email: z.union([z.email().max(254), z.literal('')]).transform((v) => v || null),
    active: z.enum(['true', 'false']).transform((value) => value === 'true'),
  }).parse(Object.fromEntries(form));
  const hourly = euroCents(form.get('hourly_cost'));
  const { identity, db } = await context('workers');
  const { id, ...values } = input;
  const { error } = await db.from('workers').update({ ...values, hourly_cost_cents: hourly })
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o elemento da equipa.');
  refresh('/crm/equipa');
}

export async function deleteWorker(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('workers');
  const { error } = await db.from('workers').delete()
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Este elemento possui horas ou obras associadas. Desative-o em vez de excluir.');
  refresh('/crm/equipa');
}

export async function createSupplier(form: FormData) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      tax_id: optionalText(30),
      phone: optionalText(40),
      email: z
        .union([z.email().max(254), z.literal('')])
        .transform((v) => v || null),
      category: optionalText(120),
      address: optionalText(300),
      notes: optionalText(3000),
    })
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('materials');
  const { error } = await db
    .from('suppliers')
    .insert({ ...input, company_id: identity.companyId });
  if (error) throw new Error('Não foi possível criar o fornecedor.');
  refresh('/crm/fornecedores');
}

export async function updateSupplier(form: FormData) {
  const input = z.object({
    id: uuid,
    name: z.string().trim().min(2).max(200),
    tax_id: optionalText(30),
    phone: optionalText(40),
    email: z.union([z.email().max(254), z.literal('')]).transform((v) => v || null),
    category: optionalText(120),
    address: optionalText(300),
    notes: optionalText(3000),
    active: z.enum(['true', 'false']).transform((value) => value === 'true'),
  }).parse(Object.fromEntries(form));
  const { identity, db } = await context('materials');
  const { id, ...values } = input;
  const { error } = await db.from('suppliers').update(values)
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o fornecedor.');
  refresh('/crm/fornecedores', '/crm/materiais');
}

export async function deleteSupplier(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('materials');
  const { error } = await db.from('suppliers').delete()
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Este fornecedor possui materiais ou compras associados. Desative-o em vez de excluir.');
  refresh('/crm/fornecedores', '/crm/materiais');
}

export async function createMaterial(form: FormData) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      category: optionalText(120),
      unit: z.enum(['un', 'm', 'm²', 'm³', 'kg', 'L', 'cx', 'dia', 'hora']),
      supplier_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
    })
    .parse(Object.fromEntries(form));
  const cost = euroCents(form.get('cost'));
  const { identity, db } = await context('materials');
  const { error } = await db
    .from('materials')
    .insert({
      ...input,
      last_cost_cents: cost,
      average_cost_cents: cost,
      company_id: identity.companyId,
    });
  if (error) throw new Error('Não foi possível criar o material.');
  refresh('/crm/materiais');
}

export async function updateMaterial(form: FormData) {
  const input = z.object({
    id: uuid,
    name: z.string().trim().min(2).max(200),
    category: optionalText(120),
    unit: z.enum(['un', 'm', 'm²', 'm³', 'kg', 'L', 'cx', 'dia', 'hora']),
    supplier_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
    active: z.enum(['true', 'false']).transform((value) => value === 'true'),
  }).parse(Object.fromEntries(form));
  const cost = euroCents(form.get('cost'));
  const { identity, db } = await context('materials');
  const { id, ...values } = input;
  const { error } = await db.from('materials').update({
    ...values, last_cost_cents: cost, average_cost_cents: cost,
  }).eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o material.');
  refresh('/crm/materiais');
}

export async function deleteMaterial(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, db } = await context('materials');
  const { error } = await db.from('materials').delete()
    .eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Este material possui compras associadas. Desative-o em vez de excluir.');
  refresh('/crm/materiais');
}

export async function createPurchase(form: FormData) {
  const input = z
    .object({
      project_id: uuid,
      supplier_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      requested_on: date,
      notes: optionalText(3000),
    })
    .parse(Object.fromEntries(form));
  const total = euroCents(form.get('total'));
  const { identity, db } = await context('purchases');
  const { error } = await db
    .from('purchases')
    .insert({ ...input, total_cents: total, company_id: identity.companyId });
  if (error) throw new Error('Não foi possível criar a compra.');
  refresh('/crm/compras', '/crm');
}

export async function createExpense(form: FormData) {
  const input = z
    .object({
      project_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      supplier_id: z.union([uuid, z.literal('')]).transform((v) => v || null),
      category: z.enum([
        'MATERIAIS',
        'MAO_DE_OBRA',
        'SUBEMPREITADA',
        'TRANSPORTE',
        'COMBUSTIVEL',
        'FERRAMENTAS',
        'EQUIPAMENTOS',
        'LICENCAS',
        'RESIDUOS',
        'OUTROS',
      ]),
      description: z.string().trim().min(2).max(500),
      spent_on: date,
      payment_method: optionalText(80),
      vat_percent: z.coerce.number().min(0).max(100),
    })
    .parse(Object.fromEntries(form));
  const net = euroCents(form.get('net'));
  const vat = Math.round((net * input.vat_percent) / 100);
  const { identity, db } = await context('finance');
  const { error } = await db
    .from('expenses')
    .insert({
      company_id: identity.companyId,
      project_id: input.project_id,
      supplier_id: input.supplier_id,
      category: input.category,
      description: input.description,
      spent_on: input.spent_on,
      payment_method: input.payment_method,
      net_cents: net,
      vat_cents: vat,
      total_cents: net + vat,
    });
  if (error) throw new Error('Não foi possível registar a despesa.');
  refresh('/crm/despesas', '/crm/financeiro', '/crm');
}

export async function createPaymentSchedule(form: FormData) {
  const input = z
    .object({
      project_id: uuid,
      client_id: uuid,
      description: z.string().trim().min(2).max(300),
      due_on: date,
    })
    .parse(Object.fromEntries(form));
  const amount = euroCents(form.get('amount'));
  if (amount <= 0) throw new Error('O valor tem de ser superior a zero.');
  const { identity, db } = await context('finance');
  const { error } = await db
    .from('payment_schedules')
    .insert({ ...input, amount_cents: amount, company_id: identity.companyId });
  if (error) throw new Error('Não foi possível criar a prestação.');
  refresh('/crm/pagamentos', '/crm/financeiro', '/crm');
}

export async function createPayment(form: FormData) {
  const input = z.object({
    schedule_id: uuid,
    received_on: date,
    payment_method: optionalText(80),
    reference: optionalText(160),
  }).parse(Object.fromEntries(form));
  const amount = euroCents(form.get('amount'));
  if (amount <= 0) throw new Error('O valor recebido tem de ser superior a zero.');
  const { identity, db } = await context('finance');
  const { data: schedule, error: scheduleError } = await db.from('payment_schedules')
    .select('id,amount_cents,status,payments(amount_cents)')
    .eq('id', input.schedule_id).eq('company_id', identity.companyId).single();
  if (scheduleError || !schedule) throw new Error('Não foi possível localizar a prestação.');
  if (schedule.status === 'CANCELADO') throw new Error('Não é possível receber uma prestação cancelada.');
  const alreadyReceived = (schedule.payments ?? []).reduce(
    (total, payment) => total + Number(payment.amount_cents), 0,
  );
  const outstanding = Number(schedule.amount_cents) - alreadyReceived;
  if (amount > outstanding) throw new Error('O valor recebido é superior ao saldo da prestação.');
  const { error } = await db.from('payments').insert({
    company_id: identity.companyId,
    schedule_id: input.schedule_id,
    amount_cents: amount,
    received_on: input.received_on,
    payment_method: input.payment_method,
    reference: input.reference,
    created_by: identity.id,
  });
  if (error) throw new Error('Não foi possível registar a entrada.');
  if (amount === outstanding) {
    const { error: statusError } = await db.from('payment_schedules')
      .update({ status: 'PAGO' }).eq('id', input.schedule_id)
      .eq('company_id', identity.companyId);
    if (statusError) throw new Error('A entrada foi registada, mas o estado não foi atualizado.');
  }
  refresh('/crm/pagamentos', '/crm/financeiro', '/crm/relatorios', '/crm');
}

export async function updateCompany(form: FormData) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      legal_name: optionalText(200),
      tax_id: optionalText(30),
      address: optionalText(300),
      phone: optionalText(40),
      email: z
        .union([z.email().max(254), z.literal('')])
        .transform((v) => v || null),
      website: z
        .union([z.url().max(300), z.literal('')])
        .transform((v) => v || null),
      iban: optionalText(50),
      default_vat: z.coerce.number().min(0).max(100),
      timezone: z.string().trim().min(2).max(80),
    })
    .parse(Object.fromEntries(form));
  const { identity, db } = await context('settings');
  const { error } = await db
    .from('companies')
    .update(input)
    .eq('id', identity.companyId);
  if (error) throw new Error('Não foi possível guardar as configurações.');
  refresh('/crm/configuracoes');
}

const statusConfiguration = {
  task: {
    table: 'tasks',
    resource: 'tasks',
    values: ['POR_FAZER', 'EM_CURSO', 'BLOQUEADA', 'CONCLUIDA'],
    path: '/crm/tarefas',
  },
  project: {
    table: 'projects',
    resource: 'projects',
    values: [
      'PLANEAMENTO',
      'PREPARACAO',
      'EM_EXECUCAO',
      'PAUSADA',
      'AGUARDANDO_CLIENTE',
      'AGUARDANDO_MATERIAL',
      'CONCLUIDA',
      'ENTREGUE',
    ],
    path: '/crm/obras',
  },
  purchase: {
    table: 'purchases',
    resource: 'purchases',
    values: ['SOLICITADA', 'APROVADA', 'COMPRADA', 'RECEBIDA', 'CANCELADA'],
    path: '/crm/compras',
  },
  payment: {
    table: 'payment_schedules',
    resource: 'finance',
    values: ['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'],
    path: '/crm/pagamentos',
  },
} as const;

export async function updateStatus(form: FormData) {
  const entity = z
    .enum(['task', 'project', 'purchase', 'payment'])
    .parse(form.get('entity'));
  const id = uuid.parse(form.get('id'));
  const status = z.string().parse(form.get('status'));
  const config = statusConfiguration[entity];
  if (!(config.values as readonly string[]).includes(status))
    throw new Error('Estado inválido.');
  const { identity, db } = await context(config.resource);
  const values: Record<string, unknown> = { status };
  if (entity === 'task')
    values.completed_at =
      status === 'CONCLUIDA' ? new Date().toISOString() : null;
  const { error } = await db
    .from(config.table)
    .update(values)
    .eq('id', id)
    .eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o estado.');
  refresh(config.path, '/crm');
}

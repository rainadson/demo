'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { documentExtension, documentKinds, validDocument } from './validation';

const bucket = 'documents-private';
const uuid = z.uuid();
const fields = z.object({
  client_id: uuid,
  project_id: z.union([uuid, z.literal('')]).transform((value) => value || null),
  name: z.string().trim().min(2).max(240),
  kind: z.enum(documentKinds),
});

async function documentContext() {
  const identity = await requirePermission('documents');
  const admin = getSupabaseAdmin();
  if (!admin || admin.companyId !== identity.companyId)
    throw new Error('O armazenamento privado de documentos não está configurado.');
  return { identity, admin };
}

async function validateRelations(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  companyId: string,
  clientId: string,
  projectId: string | null,
) {
  const { data: client } = await admin.db.from('clients').select('id')
    .eq('company_id', companyId).eq('id', clientId).single();
  if (!client) throw new Error('Cliente não encontrado.');
  if (!projectId) return;
  const { data: project } = await admin.db.from('projects').select('id')
    .eq('company_id', companyId).eq('client_id', clientId).eq('id', projectId).single();
  if (!project) throw new Error('A obra selecionada não pertence ao cliente.');
}

function refreshDocuments() {
  revalidatePath('/crm/documentos');
}

export async function createDocument(form: FormData) {
  const input = fields.parse(Object.fromEntries(form));
  const file = form.get('file');
  if (!(file instanceof File) || !(await validDocument(file)))
    throw new Error('Selecione um PDF, JPG, PNG ou WebP válido, até 10 MB.');
  const { identity, admin } = await documentContext();
  await validateRelations(admin, identity.companyId, input.client_id, input.project_id);
  const storagePath = `${identity.companyId}/${input.client_id}/${randomUUID()}.${documentExtension(file.type)}`;
  const upload = await admin.db.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error('Não foi possível guardar o documento.');
  const { error } = await admin.db.from('documents').insert({
    company_id: identity.companyId,
    client_id: input.client_id,
    project_id: input.project_id,
    kind: input.kind,
    name: input.name,
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    created_by: identity.id,
  });
  if (error) {
    await admin.db.storage.from(bucket).remove([storagePath]);
    throw new Error('Não foi possível registar o documento.');
  }
  refreshDocuments();
}

export async function updateDocument(form: FormData) {
  const input = fields.extend({ id: uuid }).parse(Object.fromEntries(form));
  const fileValue = form.get('file');
  const replacement = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (replacement && !(await validDocument(replacement)))
    throw new Error('Selecione um PDF, JPG, PNG ou WebP válido, até 10 MB.');
  const { identity, admin } = await documentContext();
  await validateRelations(admin, identity.companyId, input.client_id, input.project_id);
  const { data: current } = await admin.db.from('documents')
    .select('id,storage_path,mime_type,size_bytes').eq('company_id', identity.companyId)
    .eq('id', input.id).single();
  if (!current) throw new Error('Documento não encontrado.');

  let newPath: string | null = null;
  if (replacement) {
    newPath = `${identity.companyId}/${input.client_id}/${randomUUID()}.${documentExtension(replacement.type)}`;
    const upload = await admin.db.storage.from(bucket).upload(newPath, replacement, {
      contentType: replacement.type,
      upsert: false,
    });
    if (upload.error) throw new Error('Não foi possível guardar o novo ficheiro.');
  }
  const { error } = await admin.db.from('documents').update({
    client_id: input.client_id,
    project_id: input.project_id,
    kind: input.kind,
    name: input.name,
    storage_path: newPath ?? current.storage_path,
    mime_type: replacement?.type ?? current.mime_type,
    size_bytes: replacement?.size ?? current.size_bytes,
  }).eq('company_id', identity.companyId).eq('id', input.id);
  if (error) {
    if (newPath) await admin.db.storage.from(bucket).remove([newPath]);
    throw new Error('Não foi possível atualizar o documento.');
  }
  if (newPath) await admin.db.storage.from(bucket).remove([current.storage_path]);
  refreshDocuments();
}

export async function deleteDocument(form: FormData) {
  const id = uuid.parse(form.get('id'));
  const { identity, admin } = await documentContext();
  const { data: current } = await admin.db.from('documents').select('storage_path')
    .eq('company_id', identity.companyId).eq('id', id).single();
  if (!current) throw new Error('Documento não encontrado.');
  const { error } = await admin.db.from('documents').delete()
    .eq('company_id', identity.companyId).eq('id', id);
  if (error) throw new Error('Não foi possível excluir o documento.');
  await admin.db.storage.from(bucket).remove([current.storage_path]);
  refreshDocuments();
}

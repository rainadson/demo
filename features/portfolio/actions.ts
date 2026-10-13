'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabase } from '@/lib/supabase/server';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function validImage(file: File) {
  if (!imageTypes.has(file.type) || file.size < 1 || file.size > 5_000_000)
    return false;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (file.type === 'image/png')
    return bytes.slice(0, 8).every((byte, index) =>
      byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

function extension(file: File) {
  return file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
}

export async function publishProjectPortfolio(form: FormData) {
  const input = z.object({
    project_id: z.uuid(),
    description: z.string().trim().max(500).transform((value) => value || null),
  }).parse(Object.fromEntries(form));
  const before = form.get('before');
  const after = form.get('after');
  if (!(before instanceof File) || !(after instanceof File) ||
      !(await validImage(before)) || !(await validImage(after)))
    throw new Error('Selecione duas imagens JPG, PNG ou WebP válidas, até 5 MB cada.');

  const identity = await requirePermission('projects');
  const db = await getSupabase();
  const admin = getSupabaseAdmin();
  if (!db || !admin || admin.companyId !== identity.companyId)
    throw new Error('O armazenamento de fotografias não está configurado.');
  const { data: project } = await db.from('projects').select('id').eq('id', input.project_id)
    .eq('company_id', identity.companyId).single();
  if (!project) throw new Error('Obra não encontrada.');

  const { data: previous } = await admin.db.from('project_photos')
    .select('id,storage_path,portfolio_order').eq('company_id', identity.companyId)
    .eq('project_id', input.project_id).in('phase', ['ANTES', 'DEPOIS']);
  const { data: last } = await admin.db.from('project_photos').select('portfolio_order')
    .eq('company_id', identity.companyId).eq('publicable', true)
    .order('portfolio_order', { ascending: false }).limit(1).maybeSingle();
  const portfolioOrder = previous?.[0]?.portfolio_order ?? Number(last?.portfolio_order ?? 0) + 1;
  const pairId = randomUUID();
  const beforePath = `${identity.companyId}/${input.project_id}/${pairId}-antes.${extension(before)}`;
  const afterPath = `${identity.companyId}/${input.project_id}/${pairId}-depois.${extension(after)}`;

  const beforeUpload = await admin.db.storage.from('project-portfolio').upload(beforePath, before, {
    contentType: before.type, upsert: false,
  });
  if (beforeUpload.error) throw new Error('Não foi possível guardar a foto de antes.');
  const afterUpload = await admin.db.storage.from('project-portfolio').upload(afterPath, after, {
    contentType: after.type, upsert: false,
  });
  if (afterUpload.error) {
    await admin.db.storage.from('project-portfolio').remove([beforePath]);
    throw new Error('Não foi possível guardar a foto de depois.');
  }

  const now = new Date().toISOString();
  const { error } = await admin.db.from('project_photos').insert([
    { company_id: identity.companyId, project_id: input.project_id, phase: 'ANTES', description: input.description, storage_path: beforePath, publicable: true, portfolio_order: portfolioOrder, published_at: now, created_by: identity.id },
    { company_id: identity.companyId, project_id: input.project_id, phase: 'DEPOIS', description: input.description, storage_path: afterPath, publicable: true, portfolio_order: portfolioOrder, published_at: now, created_by: identity.id },
  ]);
  if (error) {
    await admin.db.storage.from('project-portfolio').remove([beforePath, afterPath]);
    throw new Error('Não foi possível publicar as fotografias.');
  }
  if (previous?.length) {
    await admin.db.from('project_photos').delete().in('id', previous.map((photo) => photo.id));
    await admin.db.storage.from('project-portfolio').remove(previous.map((photo) => photo.storage_path));
  }
  revalidatePath('/crm/portfolio');
  revalidatePath('/projetos');
}

export async function updateProjectPortfolio(form: FormData) {
  const input = z.object({
    project_id: z.uuid(),
    description: z.string().trim().max(500).transform((value) => value || null),
    portfolio_order: z.coerce.number().int().min(1).max(1000),
  }).parse(Object.fromEntries(form));
  const beforeValue = form.get('before');
  const afterValue = form.get('after');
  const replacements = {
    ANTES: beforeValue instanceof File && beforeValue.size > 0 ? beforeValue : null,
    DEPOIS: afterValue instanceof File && afterValue.size > 0 ? afterValue : null,
  } as const;
  if ((replacements.ANTES && !(await validImage(replacements.ANTES))) ||
      (replacements.DEPOIS && !(await validImage(replacements.DEPOIS))))
    throw new Error('Selecione imagens JPG, PNG ou WebP válidas, até 5 MB cada.');

  const identity = await requirePermission('projects');
  const admin = getSupabaseAdmin();
  if (!admin || admin.companyId !== identity.companyId)
    throw new Error('O armazenamento de fotografias não está configurado.');
  const { data: current } = await admin.db.from('project_photos')
    .select('id,phase,storage_path').eq('company_id', identity.companyId)
    .eq('project_id', input.project_id).in('phase', ['ANTES', 'DEPOIS']);
  if (!current || !current.some((photo) => photo.phase === 'ANTES') || !current.some((photo) => photo.phase === 'DEPOIS'))
    throw new Error('O par de fotografias não foi encontrado.');

  const uploaded: { phase: 'ANTES' | 'DEPOIS'; path: string; oldPath: string }[] = [];
  for (const phase of ['ANTES', 'DEPOIS'] as const) {
    const file = replacements[phase];
    if (!file) continue;
    const old = current.find((photo) => photo.phase === phase)!;
    const path = `${identity.companyId}/${input.project_id}/${randomUUID()}-${phase.toLowerCase()}.${extension(file)}`;
    const result = await admin.db.storage.from('project-portfolio').upload(path, file, { contentType: file.type, upsert: false });
    if (result.error) {
      if (uploaded.length) await admin.db.storage.from('project-portfolio').remove(uploaded.map((item) => item.path));
      throw new Error(`Não foi possível guardar a foto de ${phase === 'ANTES' ? 'antes' : 'depois'}.`);
    }
    uploaded.push({ phase, path, oldPath: old.storage_path });
  }

  const applied: typeof uploaded = [];
  for (const item of uploaded) {
    const row = current.find((photo) => photo.phase === item.phase)!;
    const result = await admin.db.from('project_photos').update({ storage_path: item.path })
      .eq('company_id', identity.companyId).eq('id', row.id);
    if (result.error) {
      for (const changed of applied) {
        const changedRow = current.find((photo) => photo.phase === changed.phase)!;
        await admin.db.from('project_photos').update({ storage_path: changed.oldPath })
          .eq('company_id', identity.companyId).eq('id', changedRow.id);
      }
      await admin.db.storage.from('project-portfolio').remove(uploaded.map((entry) => entry.path));
      throw new Error('Não foi possível atualizar as fotografias.');
    }
    applied.push(item);
  }
  const { error } = await admin.db.from('project_photos').update({
    description: input.description, portfolio_order: input.portfolio_order,
  }).eq('company_id', identity.companyId).eq('project_id', input.project_id)
    .in('phase', ['ANTES', 'DEPOIS']);
  if (error) {
    for (const item of applied) {
      const row = current.find((photo) => photo.phase === item.phase)!;
      await admin.db.from('project_photos').update({ storage_path: item.oldPath })
        .eq('company_id', identity.companyId).eq('id', row.id);
    }
    if (uploaded.length) await admin.db.storage.from('project-portfolio').remove(uploaded.map((item) => item.path));
    throw new Error('Não foi possível atualizar a publicação.');
  }
  if (uploaded.length) await admin.db.storage.from('project-portfolio').remove(uploaded.map((item) => item.oldPath));
  revalidatePath('/crm/portfolio');
  revalidatePath('/projetos');
}

export async function removeProjectPortfolio(form: FormData) {
  const projectId = z.uuid().parse(form.get('project_id'));
  const identity = await requirePermission('projects');
  const admin = getSupabaseAdmin();
  if (!admin || admin.companyId !== identity.companyId)
    throw new Error('O armazenamento de fotografias não está configurado.');
  const { data: photos } = await admin.db.from('project_photos').select('id,storage_path')
    .eq('company_id', identity.companyId).eq('project_id', projectId)
    .in('phase', ['ANTES', 'DEPOIS']);
  if (photos?.length) {
    await admin.db.from('project_photos').delete().in('id', photos.map((photo) => photo.id));
    await admin.db.storage.from('project-portfolio').remove(photos.map((photo) => photo.storage_path));
  }
  revalidatePath('/crm/portfolio');
  revalidatePath('/projetos');
}

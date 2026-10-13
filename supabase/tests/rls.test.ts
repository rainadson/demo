import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

void test('PostgreSQL: migration, isolation, assignment, escalation, constraints and audit', async () => {
  const db = new PGlite();
  const uuid = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security; create function storage.foldername(value text) returns text[] language sql immutable as $$ select string_to_array(value,'/') $$;`,
    );
    const sql = await readFile(
      new URL('../migrations/202609070001_foundation.sql', import.meta.url),
      'utf8',
    );
    // PGlite has core gen_random_uuid; extension packaging is specific to Supabase.
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
    const intakeSql = await readFile(
      new URL('../migrations/202609080002_website_intake.sql', import.meta.url),
      'utf8',
    );
    await db.exec(intakeSql);
    const commercialSql = await readFile(
      new URL('../migrations/202609080003_commercial.sql', import.meta.url),
      'utf8',
    );
    await db.exec(commercialSql);
    const serviceSql = await readFile(
      new URL(
        '../migrations/202609090004_service_role_grants.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await db.exec(serviceSql);
    const operationsSql = await readFile(
      new URL(
        '../migrations/202609100005_operations_finance.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await db.exec(operationsSql);
    const supplySql = await readFile(
      new URL('../migrations/202609220006_supply_requests.sql', import.meta.url),
      'utf8',
    );
    await db.exec(supplySql);
    const supplyNoPhoneSql = await readFile(
      new URL('../migrations/202609220007_supply_requests_without_phone.sql', import.meta.url),
      'utf8',
    );
    await db.exec(supplyNoPhoneSql);
    await db.exec('set role service_role;');
    for (let attempt = 1; attempt <= 5; attempt++)
      assert.equal(
        (
          await db.query<{ register_lead_attempt: boolean }>(
            `select public.register_lead_attempt('${'a'.repeat(64)}',5)`,
          )
        ).rows[0]?.register_lead_attempt,
        true,
      );
    assert.equal(
      (
        await db.query<{ register_lead_attempt: boolean }>(
          `select public.register_lead_attempt('${'a'.repeat(64)}',5)`,
        )
      ).rows[0]?.register_lead_attempt,
      false,
      'daily lead intake is limited atomically',
    );
    await db.exec('reset role;');
    await db.exec(
      `insert into public.companies(id,name) values('${uuid(1)}','DEMO A'),('${uuid(2)}','DEMO B');`,
    );
    for (const [n, tenant, role] of [
      [11, 1, 'ADMIN'],
      [12, 2, 'ADMIN'],
      [13, 1, 'COMERCIAL'],
      [14, 1, 'COLABORADOR'],
      [15, 1, 'CLIENTE'],
      [16, 1, 'FINANCEIRO'],
      [17, 1, 'GESTOR_OBRA'],
    ] as const) {
      await db.exec(
        `insert into auth.users values('${uuid(n)}'); insert into public.profiles(id,company_id,full_name,role) values('${uuid(n)}','${uuid(tenant)}','DEMO ${role}','${role}');`,
      );
    }
    await db.exec(`insert into public.clients(id,company_id,name) values('${uuid(21)}','${uuid(1)}','DEMO CLIENT A'),('${uuid(22)}','${uuid(2)}','DEMO CLIENT B');
   insert into public.leads(id,company_id,name,service) values('${uuid(31)}','${uuid(1)}','DEMO A','Pintura'),('${uuid(32)}','${uuid(2)}','DEMO B','Pintura');
   insert into public.projects(id,company_id,client_id,name) values('${uuid(41)}','${uuid(1)}','${uuid(21)}','DEMO P1'),('${uuid(42)}','${uuid(1)}','${uuid(21)}','DEMO P2');
   insert into public.project_members values('${uuid(1)}','${uuid(41)}','${uuid(14)}');
   insert into public.project_financials(project_id,company_id,contracted_cents) values('${uuid(41)}','${uuid(1)}',10000);`);
    await db.exec(`set role service_role; insert into public.supply_requests(company_id,reference,requester_name,work_site,kind,item_name,quantity,unit,needed_on)
      values('${uuid(1)}','AR-MAT-TEST-1','Funcionário A','Obra A','MATERIAL','Cimento',2,'saco',current_date),
      ('${uuid(2)}','AR-MAT-TEST-2','Funcionário B','Obra B','FERRAMENTA','Berbequim',1,'unidade',current_date); reset role;`);
    const asUser = async (n: number) => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${uuid(n)}',false); set role authenticated;`,
      );
    };
    await asUser(11);
    assert.equal((await db.query('select * from public.supply_requests')).rows.length, 1, 'admin sees only company requests');
    assert.equal((await db.query(`update public.supply_requests set status='APROVADO' where company_id='${uuid(2)}' returning id`)).rows.length, 0, 'admin cannot update another company request');
    assert.equal(
      (await db.query('select * from public.leads')).rows.length,
      1,
      'admin cannot read another company',
    );
    assert.equal(
      (
        await db.query(
          `update public.leads set name='ILLEGAL' where id='${uuid(32)}' returning id`,
        )
      ).rows.length,
      0,
      'cross-company update denied',
    );
    await assert.rejects(
      db.exec(
        `insert into public.leads(company_id,name,service) values('${uuid(2)}','ILLEGAL','X')`,
      ),
      'cross-company insert denied',
    );
    await assert.rejects(
      db.exec(
        `update public.leads set company_id='${uuid(2)}' where id='${uuid(31)}'`,
      ),
      'tenant cannot change',
    );
    await assert.rejects(
      db.exec(
        `insert into public.projects(company_id,client_id,name) values('${uuid(1)}','${uuid(22)}','ILLEGAL')`,
      ),
      'cross-company reference denied',
    );
    await asUser(13);
    assert.equal((await db.query('select * from public.supply_requests')).rows.length, 0, 'commercial cannot read employee requests');
    assert.equal((await db.query('select * from public.leads')).rows.length, 1);
    assert.equal(
      (await db.query('select * from public.project_financials')).rows.length,
      0,
    );
    assert.equal(
      (await db.query('select * from public.lead_activities')).rows.length,
      1,
      'commercial sees own lead timeline',
    );
    await assert.rejects(
      db.exec(`update public.profiles set role='ADMIN' where id='${uuid(13)}'`),
      'self role escalation denied',
    );
    await db.exec(
      `update public.leads set status='CONTACTADO' where id='${uuid(31)}'`,
    );
    assert.equal(
      (
        await db.query(
          `select * from public.lead_activities where kind='MUDANCA_ETAPA'`,
        )
      ).rows.length,
      1,
      'status timeline is atomic',
    );
    await asUser(14);
    assert.equal((await db.query('select * from public.supply_requests')).rows.length, 0, 'collaborator cannot read other requests');
    assert.equal(
      (await db.query('select * from public.projects')).rows.length,
      1,
      'worker only assigned projects',
    );
    assert.equal(
      (await db.query('select * from public.project_financials')).rows.length,
      0,
      'worker cannot see costs',
    );
    assert.equal(
      (await db.query(`update public.projects set name='ILLEGAL' returning id`))
        .rows.length,
      0,
      'worker cannot modify projects',
    );
    await asUser(15);
    for (const table of [
      'leads',
      'lead_activities',
      'clients',
      'projects',
      'project_financials',
      'audit_log',
    ])
      assert.equal(
        (await db.query(`select * from public.${table}`)).rows.length,
        0,
        `client cannot access ${table}`,
      );
    await asUser(16);
    assert.equal(
      (await db.query('select * from public.project_financials')).rows.length,
      1,
    );
    assert.equal((await db.query('select * from public.leads')).rows.length, 0);
    await db.exec(
      `insert into public.expenses(company_id,project_id,category,description,net_cents,vat_cents,total_cents,spent_on) values('${uuid(1)}','${uuid(41)}','MATERIAIS','DEMO COST',1000,230,1230,current_date);`,
    );
    assert.equal(
      (await db.query('select * from public.expenses')).rows.length,
      1,
      'finance can manage project expenses',
    );
    assert.equal(
      (await db.query('select * from public.tasks')).rows.length,
      0,
      'finance cannot access operational tasks',
    );
    await asUser(17);
    assert.equal((await db.query('select * from public.supply_requests')).rows.length, 1, 'manager sees company requests');
    await db.exec(`update public.supply_requests set status='EM_ANALISE' where reference='AR-MAT-TEST-1'`);
    assert.equal((await db.query<{ status: string }>(`select status from public.supply_requests where reference='AR-MAT-TEST-1'`)).rows[0]?.status, 'EM_ANALISE');
    assert.equal(
      (await db.query('select * from public.projects')).rows.length,
      2,
    );
    assert.equal(
      (await db.query('select * from public.project_financials')).rows.length,
      0,
    );
    await db.exec(
      `insert into public.tasks(company_id,project_id,title) values('${uuid(1)}','${uuid(41)}','DEMO TASK');`,
    );
    assert.equal(
      (await db.query('select * from public.tasks')).rows.length,
      1,
      'project manager can manage tasks',
    );
    assert.equal(
      (await db.query('select * from public.expenses')).rows.length,
      0,
      'project manager cannot access financial expenses',
    );
    await asUser(11);
    assert.equal(
      (
        await db.query(
          `select * from public.audit_log where actor_id='${uuid(13)}' and action='UPDATE'`,
        )
      ).rows.length,
      1,
      'audit records actor',
    );
    await asUser(16);
    await db.exec(
      `update public.project_financials set contracted_cents=12000 where project_id='${uuid(41)}'`,
    );
    await asUser(11);
    assert.equal(
      (
        await db.query(
          `select * from public.audit_log where actor_id='${uuid(16)}' and entity='project_financials' and action='UPDATE'`,
        )
      ).rows.length,
      1,
      'financial changes are audited',
    );
    await assert.rejects(
      db.exec('delete from public.audit_log'),
      'audit cannot be deleted',
    );
    await db.exec(
      `reset role; update public.profiles set active=false where id='${uuid(13)}'`,
    );
    await asUser(13);
    assert.equal(
      (await db.query('select * from public.leads')).rows.length,
      0,
      'inactive user denied',
    );
    await db.exec('reset role; set role anon;');
    await assert.rejects(
      db.query('select * from public.leads'),
      'anonymous reads denied',
    );
  } finally {
    await db.close();
  }
});

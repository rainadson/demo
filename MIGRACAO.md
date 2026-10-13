# Transferência para as contas do cliente

Este documento descreve a entrega do GitHub, Supabase, Render e Vercel ao cliente. O percurso recomendado transfere os recursos existentes para preservar utilizadores, dados, fotografias e documentos.

## Entrega executada em 26/09/2026

- GitHub: `https://github.com/luisvilasboas/alicerce-referencial`.
- Site e domínio principal: `https://alicercereferencial.pt`.
- Vercel: projeto `alicerce-referencial` na equipa `alicerce-referencial`.
- Render: `https://alicerce-referencial-backend-6gal.onrender.com`.
- Supabase: projeto `vjuymrlhuaemhvfeijrh` na organização do cliente.
- Supabase Auth: Site URL e redirecionamentos atualizados para o novo Render e para o domínio definitivo.
- DNS e HTTPS: ativos para o domínio principal e `www`; `www` redireciona permanentemente para o domínio principal.
- Verificação automática de produção: aprovada.

As instruções seguintes ficam como procedimento de recuperação e futura mudança de conta. Não repetir a transferência nem recriar o banco no ambiente entregue.

## Dados que o cliente deve fornecer

- utilizador ou organização de destino no GitHub;
- organização de destino no Supabase;
- equipa de destino na Vercel;
- workspace de destino no Render;
- domínio definitivo, caso exista;
- pessoa responsável pela faturação e pela guarda das credenciais.

Não enviar chaves por email, WhatsApp ou ficheiros no repositório. Introduzir as chaves diretamente nos painéis do Supabase, Render e Vercel.

## Percurso recomendado: transferir o ambiente existente

### 1. GitHub

1. Dar ao responsável do cliente acesso ao repositório privado.
2. Em **Settings > General > Danger Zone > Transfer**, transferir `alicerce-referencial` para o utilizador ou organização do cliente.
3. Confirmar que a branch predefinida continua a ser `main` e que a action **Validate** termina com sucesso.
4. Voltar a autorizar a integração GitHub da Vercel e do Render caso o novo proprietário exija essa autorização.

A transferência preserva commits, issues, pull requests e configurações do repositório. O endereço antigo do GitHub redireciona para o novo, mas os serviços devem ser religados ao novo proprietário.

### 2. Supabase

1. O atual proprietário deve ser **Owner** da organização de origem e membro da organização do cliente.
2. No projeto `alicerce-referencial`, abrir **Project Settings > General > Transfer Project** e escolher a organização do cliente.
3. Confirmar o plano e a faturação na organização de destino.
4. Depois da transferência, validar:
   - Auth e o utilizador administrador;
   - as tabelas públicas;
   - os buckets `lead-attachments`, `project-portfolio` e `documents-private`;
   - os ficheiros existentes;
   - as chaves em **Project Settings > API**.

Esta transferência mantém o mesmo projeto, região, base de dados, Auth e Storage. Não executar novamente as migrações no projeto transferido: as dez migrações já foram aplicadas pelo SQL Editor e o histórico da CLI não foi preenchido.

Obter no painel do projeto:

| Valor | Origem |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret/service-role key; apenas no Render |
| `ALICERCE_COMPANY_ID` | resultado de `select id, name from public.companies;` |

### 3. Render

O Render não transfere um serviço individual entre workspaces. Criar um serviço novo no workspace do cliente usando o Blueprint `render.yaml` do repositório transferido.

1. No Render do cliente, escolher **New > Blueprint** e ligar o repositório.
2. Confirmar o serviço Node, região Frankfurt, branch `main`, health check `/api/health` e auto deploy.
3. Preencher as variáveis solicitadas pelo Blueprint:

| Variável | Valor |
| --- | --- |
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | chave publicável do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta do Supabase |
| `ALICERCE_COMPANY_ID` | UUID da empresa |
| `SITE_URL` | origem pública da Vercel, sem barra final |

`APP_ROLE=backend` e `NODE_VERSION=22.14.0` já estão no Blueprint. `LEAD_RATE_LIMIT_SALT` é gerado pelo Render. Não criar `BACKEND_URL` nem `QUOTE_INTAKE_URL` no backend.

4. Esperar o deploy e confirmar que `https://NOVO-SERVICO.onrender.com/api/health` devolve `status: ok` e `databaseConfigured: true`.
5. Abrir `/login`, entrar com a conta administrativa e confirmar `/crm`.

Manter o Render antigo ativo até concluir todos os testes. O plano gratuito pode demorar a iniciar após inatividade.

### 4. Vercel

Transferir o projeto existente para a equipa do cliente em **Project Settings > General > Transfer Project**. A transferência preserva deployments, domínios e variáveis do painel, mas deve-se conferir tudo depois da operação.

Configurar em **Settings > Environment Variables**, pelo menos no ambiente Production:

| Variável | Valor |
| --- | --- |
| `APP_ROLE` | `frontend` |
| `SITE_URL` | origem pública da Vercel ou domínio definitivo, sem barra final |
| `BACKEND_URL` | origem HTTPS do novo Render, sem barra final |
| `QUOTE_INTAKE_URL` | `https://NOVO-SERVICO.onrender.com/api/intake` |

Não colocar `SUPABASE_SERVICE_ROLE_KEY` na Vercel. Depois de alterar as variáveis, fazer um novo deployment de produção.

### 5. URLs do Supabase Auth

Em **Authentication > URL Configuration**:

- definir o **Site URL** como `https://NOVO-SERVICO.onrender.com/login`;
- adicionar a origem do novo Render aos Redirect URLs;
- adicionar o domínio definitivo quando houver fluxos de email que regressem ao site.

O login e os cookies do CRM vivem no domínio do Render; a Vercel encaminha `/login`, `/crm/*` e `/cliente/*` para esse backend.

### 6. Domínio e mudança final

1. Associar o domínio público ao projeto Vercel e validar DNS/HTTPS.
2. Atualizar `SITE_URL` na Vercel e no Render com o domínio público.
3. Fazer redeploy dos dois serviços.
4. Executar a verificação automática:

```bash
npm run verify:deploy -- https://DOMINIO-PUBLICO https://NOVO-SERVICO.onrender.com
```

5. Testar manualmente:
   - login administrativo e logout;
   - criar, editar e remover um registo de teste em cada CRUD;
   - enviar um pedido em `/pedidos-material` e atualizá-lo no CRM;
   - enviar um pedido de orçamento e confirmar o lead;
   - carregar documentos privados e abrir a URL assinada;
   - publicar um antes/depois, trocar uma foto e alterar a ordem;
   - verificar o site em telemóvel.
6. Só depois destes testes remover o serviço Render antigo e os acessos da equipa anterior.

## Alternativa: Supabase novo e vazio

Usar esta opção apenas se o cliente não quiser receber os dados atuais.

1. Criar um projeto Supabase na região europeia.
2. Gerar o SQL consolidado:

```bash
npm run migration:bundle
```

3. Executar `output/supabase-migrations.sql` uma única vez no SQL Editor.
4. Criar o primeiro utilizador em **Authentication > Users** e copiar o UUID.
5. Executar no SQL Editor, substituindo o UUID e o nome:

```sql
with new_company as (
  insert into public.companies (name, email, phone)
  values (
    'Alicerce Referencial Construções',
    'geral@alicercereferencial.pt',
    '+351 912 180 368'
  )
  returning id
)
insert into public.profiles (id, company_id, full_name, role, active)
select
  'UUID_DO_UTILIZADOR_AUTH'::uuid,
  id,
  'NOME_DO_ADMINISTRADOR',
  'ADMIN'::public.app_role,
  true
from new_company
returning company_id;
```

6. Usar o `company_id` devolvido como `ALICERCE_COMPANY_ID` no Render.

Um projeto vazio não contém clientes, leads, utilizadores, obras, pedidos, documentos nem fotografias do ambiente atual. Para conservar esses dados, usar a transferência do projeto existente.

## Matriz final de segredos

| Configuração | GitHub | Vercel | Render | Supabase |
| --- | ---: | ---: | ---: | ---: |
| chave publicável | não | não | sim | origem |
| service role | não | não | sim | origem |
| ID da empresa | não | não | sim | origem |
| sal antiabuso | não | não | gerado | não |
| URL do backend | não | sim | não | Redirect URL |

## Critérios de aceite

- o cliente é proprietário do GitHub, Supabase e Vercel e controla o workspace Render;
- a action do GitHub e os deployments estão verdes;
- o verificador automático termina com `Publicação validada.`;
- o administrador entra no CRM;
- os dados e os três buckets do Supabase estão disponíveis;
- os formulários públicos criam registos;
- documentos privados continuam privados;
- o portefólio público respeita a ordem definida no CRM;
- nenhuma chave secreta está no Git ou na Vercel;
- a equipa anterior foi removida apenas após o aceite do cliente.

## Referências oficiais

- [Transferir um repositório GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [Transferir um projeto Supabase](https://supabase.com/docs/guides/platform/project-transfer)
- [Transferir um projeto Vercel](https://vercel.com/docs/projects/transferring-projects)
- [Render Blueprints](https://render.com/docs/infrastructure-as-code)
- [Variáveis de ambiente no Render](https://render.com/docs/configure-environment-variables)

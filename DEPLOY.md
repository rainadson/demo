# Publicação — Alicerce Referencial

## Recursos criados

- Repositório privado do cliente: https://github.com/luisvilasboas/alicerce-referencial
- Site público: https://alicercereferencial.pt
- Endereço alternativo: https://www.alicercereferencial.pt, com redirecionamento permanente `308` para o domínio principal.
- Vercel: projeto `alicerce-referencial`, equipa `alicerce-referencial`, ligado ao GitHub do cliente.
- Backend: https://alicerce-referencial-backend-6gal.onrender.com (serviço gratuito `alicerce-referencial-backend`, Blueprint ligado à branch `main`).
- Supabase: projeto `alicerce-referencial` (`vjuymrlhuaemhvfeijrh`), organização do cliente `Alicerce Referencial`, região `eu-west-1`.
- DNS: `alicercereferencial.pt` usa o registo A indicado pela Vercel e `www` usa o CNAME individual do projeto. Os nameservers do Dominios.pt foram mantidos.

## Divisão de responsabilidades

O mesmo repositório Next.js suporta os dois alojamentos, sem duplicar o código nem trocar o framework.

| Ambiente | Configuração |
| --- | --- |
| Vercel | `APP_ROLE=frontend`, `SITE_URL` com a origem pública, `BACKEND_URL` com a origem HTTPS do Render e `QUOTE_INTAKE_URL` com o endpoint `/api/intake` do Render. Não necessita da chave administrativa Supabase. |
| Render | `APP_ROLE=backend`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALICERCE_COMPANY_ID`, `LEAD_RATE_LIMIT_SALT` e `SITE_URL`. Deixar `BACKEND_URL` e `QUOTE_INTAKE_URL` vazios. |

Quando `BACKEND_URL` estiver configurada, `/login`, `/crm/*` e `/cliente/*` no frontend encaminham para o Render. O CRM mantém a sessão no seu próprio domínio. Os pedidos de orçamento são enviados pelo servidor Vercel ao backend, sem expor a chave administrativa no browser. O backend envia `X-Robots-Tag: noindex, nofollow`.

O health check `/api/health` confirma que o servidor está a responder. O campo `databaseConfigured` indica apenas a presença e validade estrutural da configuração; não comprova conectividade, aplicação de migrações ou saúde do PostgreSQL.

## Estado da integração

O esquema das dez migrações foi aplicado no Supabase pelo SQL Editor. Existem 33 tabelas públicas, incluindo `supply_requests`, os buckets privados `lead-attachments` e `documents-private`, o bucket público `project-portfolio` e a empresa `Alicerce Referencial Construções` com ID `e8189693-eadf-4bf1-a45d-cc833a188539`. A página de histórico de migrações da CLI está vazia porque a aplicação ocorreu pelo SQL Editor; **não executar `supabase db push` contra este projeto sem reconciliar primeiro esse histórico**, pois as instruções de criação já foram executadas.

O Render guarda as chaves do Supabase, o ID da empresa e o sal de limitação em variáveis privadas. A Vercel guarda `BACKEND_URL`, `QUOTE_INTAKE_URL` e `SITE_URL`; `APP_ROLE=frontend` continua definido. O código e o GitHub não contêm essas chaves.

No Supabase Auth, o **Site URL** aponta para `https://alicerce-referencial-backend-6gal.onrender.com/login`. A lista de redirecionamentos autorizados inclui o novo Render, `https://alicercereferencial.pt` e `https://www.alicercereferencial.pt`.

## Estado da entrega

GitHub, Supabase, Render, Vercel e o domínio estão nas contas do cliente. O domínio principal tem HTTPS válido, o frontend encaminha as áreas reservadas para o Render e os dois alojamentos publicam automaticamente a branch `main`. Os serviços anteriores devem permanecer ativos apenas durante o período de aceite do cliente.

## Validações executadas

- 20 testes locais de domínio, permissões e destinos de publicação: aprovados.
- Teste PostgreSQL em memória: migrações, isolamento entre empresas, atribuições, escalada de privilégios, constraints e auditoria aprovados.
- Lint, TypeScript, 20 testes automatizados e build de produção aprovados.
- Vercel: deploy da branch `main` aprovado; páginas públicas, robots, sitemap, domínio e certificados HTTPS verificados.
- O Render responde `200` em `/api/health`, devolve `databaseConfigured: true` e envia `X-Robots-Tag: noindex, nofollow`. Este indicador valida apenas a presença da configuração.
- `https://alicercereferencial.pt/login` redireciona para o novo Render; o acesso administrativo ao CRM foi validado.
- O login do Render comunicou com o Supabase Auth e recusou corretamente credenciais fictícias; um visitante sem sessão que abre `/crm` é enviado para `/login`.
- `/api/intake` no Render rejeita uma submissão inválida sem criar lead. O acesso autenticado ao CRM, o CRUD da equipa e a edição/ordenação do portefólio foram verificados em produção.
- `npm run verify:deploy -- https://alicercereferencial.pt https://alicerce-referencial-backend-6gal.onrender.com` terminou com `Publicação validada.`
- A página inicial e o formulário de pedidos foram verificados em viewport móvel de 390 × 844 px.

Nenhum ficheiro `.env.local`, token, diretório de dependências ou build antigo foi enviado para o GitHub. `.vercelignore` também exclui os ficheiros de ambiente e artefactos antigos dos uploads por CLI.

Referências de implementação: [Next.js no Render](https://render.com/docs/deploy-nextjs-app), [publicação pela CLI Vercel](https://vercel.com/docs/projects/deploy-from-cli).

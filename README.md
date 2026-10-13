# Alicerce Referencial Construções

Plataforma de gestão para construção e renovação: site público, CRM/ERP e portal do cliente.

## Estado atual

A implementação inclui a fundação segura, o site público, o pedido de orçamento, o formulário de materiais e ferramentas para funcionários sem login e um CRM operacional com dashboard executivo, pesquisa, cadastro manual de leads, clientes, agenda, orçamentos, obras, tarefas, equipa, fornecedores, materiais, compras, despesas, pagamentos, documentos, rentabilidade, relatórios, histórico de pedidos, gestão de utilizadores e publicação de pares de fotografias antes/depois no portefólio. Todos os indicadores usam dados persistidos; as áreas reservadas não simulam métricas ou dados de negócio. O trabalho restante está em TASKS.md.

## Stack e arquitetura

Next.js 16 com App Router, React 19, TypeScript estrito, Tailwind 4, componentes shadcn/Base UI e Lucide. O mesmo servidor Node.js é compatível com Vercel e Render. Supabase Auth/PostgreSQL é o backend escolhido, sem credenciais inventadas.

- app: site público, páginas CRM por domínio e layouts com validação server-side.
- components: marca e primitivas reutilizáveis.
- features/auth: formulário e ações de sessão.
- lib/auth: identidade verificada por getUser, RBAC e guards.
- lib/supabase: cliente SSR com cookies HttpOnly.
- features/crm: ações de escrita validadas com Zod e autorização no servidor.
- features/supply-requests: pedidos públicos com validação e caixa de entrada restrita a ADMIN/GESTOR_OBRA.
- features/portfolio: publicação segura de pares de imagens antes/depois associados a obras.
- lib/domain: orçamentos, pagamentos e rentabilidade calculados em cêntimos.
- supabase/migrations: schema versionado, RLS e auditoria.
- tests: regras críticas; supabase/tests: isolamento de dados.

## Instalação

Node 22.13 ou superior e npm. Executar `npm ci`, copiar `.env.example` para `.env.local` e preencher SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY. Usar apenas a chave publicável: a autorização depende de RLS e identidade, não de uma chave administrativa. Nunca usar service role no browser.

Sem configuração, o site abre, o login informa que o acesso está em preparação e CRM/portal redirecionam para login. O formulário de orçamento explica que o envio ainda não está disponível. Não há fallback com dados pessoais locais ou login demo.

## Comandos

- `npm run dev`: desenvolvimento local.
- `npm run lint`: análise estática.
- `npm run typecheck`: verificação TypeScript.
- `npm test`: testes de domínio e autorização.
- `npm run build`: compilação de produção.
- `npm start`: executar o servidor Next.js compilado localmente.
- `npm run migration:bundle`: gerar em `output/` um SQL único com todas as migrações, para um Supabase novo.
- `npm run verify:deploy -- URL_FRONTEND URL_BACKEND`: validar os pontos críticos depois da publicação.

## Supabase

Consultar supabase/README.md. Aplicar todas as migrações pela ordem do nome e criar utilizadores via Supabase Auth. As migrações 004 e 005 concedem o acesso interno do formulário e criam os módulos operacionais e financeiros. Provisionar empresa e perfis pelo SQL Editor de administração. Não existe registo público nem alteração do próprio perfil/role pelo utilizador. Para receber pedidos pelo site, configurar também `SUPABASE_SERVICE_ROLE_KEY`, `ALICERCE_COMPANY_ID` e um `LEAD_RATE_LIMIT_SALT` aleatório com pelo menos 24 caracteres. Esta chave administrativa é lida exclusivamente pela ação no servidor.

Não se inserem seeds em produção. As fixtures dos testes são isoladas. Os contactos fiscais, telefone, email, morada, IBAN e taxa de IVA estão sem valores presumidos; a tabela companies prepara a configuração futura. A moeda e timezone têm os valores solicitados.

## Segurança e limites atuais

As tabelas privadas usam RLS. CLIENTE não tem acesso a tabelas internas; a projeção específica do portal fica para a fase 7. COLABORADOR lê apenas obras atribuídas. Chaves estrangeiras compostas evitam associação entre empresas. Apenas administração confiável provisiona perfis. Eventos de auditoria registam entidade, ação, ator e data sem copiar dados pessoais para logs.

O login usa limitação de tentativas do Supabase Auth. Os formulários públicos usam campo armadilha, tempo mínimo e limite diário atómico. O pedido de orçamento também valida os anexos. Recuperação de palavra-passe e renovação de sessão de longa duração ainda precisam do fluxo próprio.

O funcionário pode abrir `/pedidos-material` ou `/solicitacoes-compras` sem conta, identifica-se e indica obra/local, item, quantidade, data e prioridade, sem fornecer telefone. O pedido recebe uma referência; o gestor consulta, atualiza o estado e gera relatórios por período em `/crm/pedidos-material`, mediante login e permissão de compras. A identidade e a obra são declaradas pelo próprio funcionário e devem ser confirmadas pelo gestor antes da aprovação.

Os anexos aceites são JPG, PNG, WebP e PDF. O servidor confirma tamanho, MIME declarado e assinatura binária antes de gravar num bucket privado. A listagem, mudança de etapa e notas de leads voltam a validar a sessão, o papel e a empresa no servidor e no PostgreSQL.

## Build e deploy

`npm run build` gera a aplicação Next.js de produção e `npm start` executa o servidor Node.js. O Vercel deteta o projeto automaticamente. O Render usa o Blueprint em `render.yaml`, com `npm ci && npm run build` e `npm start`. Enquanto o Supabase não estiver configurado, o site público funciona, o CRM permanece bloqueado e o formulário não grava pedidos.

O repositório privado, o site público na Vercel, o backend no Render e o projeto Supabase independente estão configurados. Consultar `DEPLOY.md` para o ambiente atual e `MIGRACAO.md` para transferi-lo às contas do cliente.

Em cada alojamento, adicionar as variáveis de `.env.example` fora do Git. `SITE_URL` é opcional: quando ausente, a aplicação reconhece o URL de produção fornecido pelo Vercel ou Render. Não publicar tabelas nem dados de demonstração como conteúdo público.

### Escopo da análise estática

O lint cobre o código da Alicerce Referencial. `components/ui/**` contém o catálogo vendorizado do scaffold e é excluído do lint por incompatibilidades das regras do gerador (labels encaminhadas por props, semântica ARIA e regras do compilador React). Estes ficheiros continuam abrangidos pelo TypeScript e build; não foram alterados para silenciar o catálogo.

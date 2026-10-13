# Migrações e acesso

Aplicar as dez migrações, por ordem, num projeto Supabase novo pelo SQL Editor ou CLI (`supabase db push` após vincular projeto). A segunda migração cria a entrada segura de leads do site, o bucket privado e o limite diário de tentativas. A terceira cria o módulo comercial. A quarta concede ao serviço interno apenas os privilégios SQL necessários. A quinta cria operações, equipa, compras, custos, pagamentos, documentos, diário, avaliações e notificações. A sexta cria os pedidos de materiais e ferramentas da equipa, com escrita pelo servidor e leitura/atualização restrita a ADMIN e GESTOR_OBRA. A sétima torna o telefone opcional nesses pedidos. A oitava cria o armazenamento público do portefólio. A nona cria o bucket privado de documentos. A décima adiciona a ordenação administrável do portefólio.

`npm run migration:bundle` gera `output/supabase-migrations.sql` para facilitar a aplicação única num projeto vazio. Não usar esse bundle no projeto de produção atual.

No projeto de produção da Alicerce (`vjuymrlhuaemhvfeijrh`), estas instruções já foram aplicadas pelo SQL Editor. O histórico da CLI não contém entradas; não usar `supabase db push` nesse projeto sem reconciliar o histórico, para evitar tentar recriar objetos existentes.

Não aplicar seeds automaticamente. Criar utilizadores no Supabase Auth; provisionar a empresa e os respetivos profiles através do SQL Editor autenticado. O UUID de profiles.id deve corresponder a auth.users.id. As roles válidas são ADMIN, COMERCIAL, GESTOR_OBRA, FINANCEIRO, COLABORADOR e CLIENTE. Não usar user_metadata como fonte de permissões.

Não existem contas, emails, palavras-passe ou empresas fictícias no SQL de produção. Os testes criam dois tenants isolados em memória, sem tocar no Supabase real.

Custos previstos são separados em project_financials e custos realizados em expenses, time_entries e purchases. O cliente não recebe acesso às tabelas internas; uma projeção própria do portal será implementada na fase 7. O colaborador lê apenas projetos aos quais está atribuído. O financeiro não vê tarefas operacionais e o gestor de obra não vê despesas financeiras. Perfil inativo perde acesso. Não há política pública irrestrita.

Retenção, outbox e a projeção exclusiva do portal do cliente continuam como evoluções futuras. Os documentos privados e o CRUD administrativo já estão implementados.

Fontes de referência: https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/guides/auth/server-side/creating-a-client.

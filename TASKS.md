# Alicerce Referencial — Plano de implementação

Atualizado em 22/09/2026. Só marcar tarefas implementadas e verificadas.

## Fase 0 — Auditoria
- [x] Inspecionar pasta: inicialmente vazia, sem Git, código ou dependências.
- [x] Verificar ambiente Windows, Node 24 e npm.
- [x] Criar plano de implementação por fases.
- [x] Instalar dependências e validar lint, TypeScript e build.

## Fase 1 — Fundação
- [x] Design system, layouts e componentes acessíveis.
- [x] Configuração central e formatação portuguesa.
- [x] Separar UI, domínio, validação, autenticação e acesso a dados.
- [x] Supabase server-side e .env.example sem credenciais reais.
- [x] Login, logout e proteção do CRM e portal.
- [x] RBAC para os seis perfis com negação por omissão.
- [x] Schema multiempresa, constraints, índices, RLS e auditoria.
- [x] Executar testes de isolamento no PostgreSQL.
- [x] Configurar Supabase real e validar autenticação integral.

## Fase 2 — Site público
- [x] Home com nova imagem arquitetónica ilustrativa própria da Alicerce, distinta da base anterior.
- [x] Header e menu mobile, footer e contactos configuráveis.
- [x] Serviços e páginas individuais.
- [x] Portfólio administrável, ordenação e edição de publicações.
- [x] Comparação antes/depois acessível.
- [x] Sobre, contactos e estrutura de privacidade para revisão.
- [x] Wizard de seis etapas, validação e consentimento.
- [x] Uploads privados com limites e validação MIME.
- [x] Submissão cria lead persistente com proteção antiabuso.
- [ ] Metadata, canonical, OpenGraph, Twitter, robots, sitemap e schemas.
- [ ] Validar 375, 768, 1024 e 1440 px.

## Fase 3 — CRM comercial
- [x] Primeira ligação funcional site → lead → lista CRM → mudança de etapa → timeline.
- [x] Tabela e Kanban de leads com estados vazios e erros.
- [x] Detalhe do lead, notas e histórico automático de mudanças de etapa.
- [x] Cadastro manual de leads dentro do CRM.
- [x] Layout privado, navegação por áreas e estados de interface.
- [x] Dashboard executivo com métricas reais de comercial, obras e financeiro.
- [x] Leads: CRUD, tabela, Kanban, filtros, responsáveis e timeline.
- [ ] Qualificação e conversão de lead ganho em cliente.
- [x] Clientes: criação, lista, contactos, obras e orçamentos associados.
- [x] Clientes: edição, pagamentos e documentos associados.
- [x] Agenda e criação de visitas associadas a leads ou clientes.
- [ ] Visitas: edição, checklist e anexos.
- [x] Orçamentos: criação inicial, totais, IVA, margem e visualização de versões/itens.
- [ ] Orçamentos: editor completo de itens, custos, markup e novas versões.
- [ ] PDF profissional e condições de pagamento configuráveis.
- [ ] Aceitação de proposta e eventos auditáveis.

## Fase 4 — Obras
- [ ] Conversão transacional e idempotente de orçamento em obra.
- [x] Obras: criação, detalhe, estados, progresso e indicadores financeiros.
- [ ] Cronograma, fases, dependências e responsáveis.
- [x] Tarefas: criação, prioridades, prazos, estados e Kanban.
- [ ] Tarefas: atribuição, checklist e comentários.
- [ ] Diário de obra e ocorrências.
- [x] Fotografias antes/depois, armazenamento e publicação administrativa explícita no portefólio.
- [x] Documentos privados, CRUD por cliente e URLs assinados.
- [ ] Entrega, avaliações e autorização de publicação.

## Fase 5 — Custos
- [x] Formulário público de pedidos de materiais e ferramentas sem login, com referência e acompanhamento protegido pelo gestor.
- [x] Relatório de pedidos e compras por período.
- [x] CRUD de colaboradores, prestadores e subempreiteiros.
- [ ] Horas e custo de mão de obra.
- [x] Fornecedores, contactos e histórico de compras.
- [x] Materiais, unidades, fornecedor e custos médio/recente.
- [ ] Compras, aprovação, receção e comprovativos.
- [x] Despesas, IVA, fornecedor e associação à obra.

## Fase 6 — Financeiro
- [x] Pagamentos parciais, prestações, vencimentos e atrasos.
- [ ] Fluxo de caixa e filtros.
- [x] Rentabilidade: contratado, orçado, realizado e margem atual por obra.
- [x] Relatórios comercial, operacional e financeiro com dados reais.
- [x] Testes de cálculos críticos, orçamento, margem e pagamentos parciais.

## Fase 7 — Portal do cliente
- [ ] Acesso exclusivo ao cliente associado.
- [ ] Projeção sem custos, salários ou margens internas.
- [ ] Obra, progresso, cronograma, fotografias e documentos autorizados.
- [ ] Orçamento, pagamentos e contactos.
- [ ] Testes de acesso cruzado entre clientes e empresas.

## Fase 8 — Automações
- [ ] Outbox e eventos de domínio persistentes.
- [ ] Notificações e follow-ups.
- [x] Contactos públicos e ligação direta para WhatsApp com dados confirmados.
- [x] Pesquisa global respeitando permissões.
- [x] Administração de utilizadores com criação, edição, ativação e remoção de acesso.
- [ ] Exportação/eliminação de dados pessoais auditável.
- [ ] Contratos de integração futura do Alicerce Referencial Assistant.

## Fase 9 — Polimento e entrega
- [x] Migrar o preview para Next.js oficial e preparar Vercel/Render.
- [x] Versionar a aplicação num repositório privado no GitHub.
- [x] Publicar e validar o site na Vercel e no Render com implantação automática da branch main.
- [ ] Testar formulário → lead → visita → orçamento → cliente → obra → custos → pagamento → margem → entrega.
- [ ] Testes de segurança e RLS num Supabase configurado.
- [ ] Acessibilidade, teclado, responsividade e performance.
- [x] README com instalação, variáveis, migrations, ausência de seeds e deploy.
- [x] Aplicar migrations 004 e 005 no Supabase de produção.
- [x] Build final e publicação do produto validado.

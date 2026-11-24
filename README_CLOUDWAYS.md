# EXE PRO 3.9.1 — Cloudways Velocity Edition

Aplicação de produção do EXE PRO para Cloudways Velocity, Node.js e PostgreSQL.

## Arquitetura

- Cloud Web/PWA + API: Node.js 22+
- Banco central: PostgreSQL
- Windows: continua como cliente local/offline sincronizado
- HTTPS/domínio: gerenciado pelo Cloudways Velocity
- Cloud Lab local: continua usando SQLite no pacote Windows e não é este diretório

## Deploy no Velocity

1. Coloque **o conteúdo deste diretório** em um repositório Git privado.
2. No Cloudways Velocity, crie uma aplicação a partir desse repositório.
3. Root Directory: `./`
4. Package Manager: `npm`
5. Node.js: 22 ou superior
6. Build Command: `npm run build`
7. Start Command / Entry: `npm start`
8. Em Database, conecte/instale PostgreSQL.
9. Faça um novo deploy depois de o PostgreSQL ser conectado, para que as variáveis do banco estejam disponíveis.
10. Cadastre as variáveis EXE PRO abaixo como Sensitive quando forem segredo.

## Variáveis obrigatórias

- `EXE_CLOUD_KEY`: chave exclusiva para sincronização das instalações Windows.
- `EXE_CLOUD_SECRET_KEY`: chave separada e permanente usada para criptografar Google Places/Serper no banco.
- `EXE_CLOUD_PUBLIC_URL`: por exemplo `https://app.exekuta.com.br`.
- `EXE_CLOUD_REQUIRE_HTTPS=1`
- `EXE_CLOUD_ADMIN_USER`: usuário inicial do Cloud Web.
- `EXE_CLOUD_ADMIN_PASSWORD`: senha inicial (mínimo 8 caracteres) **ou** `EXE_CLOUD_ADMIN_PASSWORD_HASH`.

Marque `EXE_CLOUD_KEY`, `EXE_CLOUD_SECRET_KEY`, senha/hash e credenciais de banco como **Sensitive**.

## PostgreSQL

A aplicação reconhece:

- `DATABASE_URL`, `DB_URL`, `POSTGRES_URL`, `POSTGRESQL_URL`; ou
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; ou
- equivalentes `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.

Também reconhece variantes com prefixos quando o nome terminar em `DB_HOST`, `DATABASE_URL` etc.

Se o banco exigir TLS:

- `EXE_CLOUD_DB_SSL=1`
- `EXE_CLOUD_DB_SSL_VERIFY=1`

## Banco e migrações

O schema é criado/atualizado automaticamente ao iniciar a aplicação. Também pode ser executado manualmente:

```bash
npm run migrate
npm run db:test
```

### Levar a base atual para o PostgreSQL

O método recomendado é o mais seguro e simples:

1. Publique o EXE PRO 3.9.1 no Cloudways com PostgreSQL vazio.
2. No EXE PRO Windows, configure a URL pública e a mesma `EXE_CLOUD_KEY`.
3. Execute **Sistema → Sincronizar agora**.
4. Os registros locais serão enviados para o PostgreSQL, preservando IDs e versões.

Opcionalmente, se você tiver acesso de terminal ao ambiente e um arquivo `exe_pro_cloud.sqlite`, há um importador:

```bash
npm run import:sqlite -- /caminho/exe_pro_cloud.sqlite
```

## Endpoints de diagnóstico

- `/health` — processo web ativo.
- `/ready` — aplicação + PostgreSQL prontos.
- `/version` — versão e modo do servidor.
- `/app/` — Cloud Web/PWA.

## Segurança

- Sincronização Windows usa chave própria (`EXE_CLOUD_KEY`).
- Usuários Web usam usuário/senha e sessão HttpOnly.
- Escritas Web usam CSRF.
- Senhas usam scrypt.
- Segredos de integrações usam AES-256-GCM com `EXE_CLOUD_SECRET_KEY`.
- Controle de versão bloqueia sobrescrita concorrente.
- HTTPS deve permanecer obrigatório em produção.

## Domínio

Depois do deploy, adicione `app.exekuta.com.br` em **Domain Management** do Velocity e aplique no DNS exatamente os registros fornecidos pela Cloudways. Não copie IP/CNAME de outro aplicativo.

## Painel Mestre 3.6.3

A Cloud possui Painel Mestre dedicado para Super Admin. Identidade visual, dados da agência, propostas e mensagens são persistidos no PostgreSQL. O branding usa `updatedAt` para sincronização bidirecional com o EXE PRO Windows 3.6.3 sem sobrescrever silenciosamente a edição mais recente.

## Prospecção e Painel Mestre 3.6.4

A Cloud passou a exibir fotos dos resultados do Google Maps por proxy autenticado, ações Salvar todos / Salvar todos + CSV / CSV e cartões visuais próximos da versão Windows. O Painel Mestre 3.6.3 agora é embutido no HTML da aplicação para evitar bloqueio 401 dos assets externos.

## Prospecção Inteligente 3.6.5

A Cloud usa a mesma lógica-base de Lead Score do Windows, exibe filtros por potencial comercial, WhatsApp provável e presença de site, permite gerar mensagem, abrir WhatsApp rápido, procurar canais e salva no CRM os metadados de prospecção sem sobrescrever campos comerciais já preenchidos.

## Central Comercial 3.6.6

A Cloud possui fila comercial inteligente com Lead Score, follow-ups atrasados/hoje, leads sem contato, leads parados e propostas abertas. O Painel Mestre permite configurar regras de primeiro contato, retorno sem resposta, reativação e proposta. As regras criam agenda comercial somente quando o usuário confirma; nenhuma mensagem é enviada automaticamente.

## Mensagens e cobranças 3.6.7

A Cloud possui Central de Notificações Financeiras com WhatsApp Business Platform e Telegram Bot. Tokens são criptografados no PostgreSQL com EXE_CLOUD_SECRET_KEY. Cada cliente/contato precisa ter autorização registrada no Cliente 360 antes de receber avisos. WhatsApp usa templates aprovados e o Telegram exige que o cliente inicie o bot ao menos uma vez.

## Cadastro de clientes 3.6.8

O modal **Novo cliente** da Cloud passa a acompanhar a versão Windows: dados cadastrais completos, contato principal, redes sociais, responsável interno, origem, situação, serviços contratados, perfil/contexto e financeiro inicial opcional. Se a empresa já existir como Lead, a Cloud pode converter o mesmo registro em Cliente, preservando o histórico em vez de criar duplicidade.

## Clientes e mensalidades 3.6.9

A carteira de Clientes ganhou ações **Editar**, **360°** e **Excluir**. A coluna de valor passa a representar a mensalidade recorrente ligada ao cliente. O cadastro/edição agora grava o valor mensal também no Cliente e vincula corretamente Contrato e Recebível por `leadId`. A exclusão Cloud é lógica/tombstone e entra no journal de sincronização para chegar ao Windows.

## WordPress Client Control 3.7.0

A Cloud passa a gerenciar sites WordPress de clientes por meio do plugin próprio **EXE PRO Connector**. Cada site usa uma chave exclusiva armazenada criptografada no Cloud e comunicação HMAC SHA-256. O controle pode testar conexão, suspender temporariamente, reativar e avaliar regras automáticas com base no Financeiro. A suspensão só é permitida quando a autorização contratual estiver marcada. O frontend WordPress responde HTTP 503 durante a suspensão, preservando wp-admin e dados do site.

## Serviços por site + WordPress Designer 3.7.1

Clientes podem ter vários serviços com site/domínio, valor, periodicidade, vencimento e status. Serviços mensais ativos alimentam automaticamente o total mensal do cliente. O WordPress Client Control ganhou três modelos editáveis de página 503 — Institucional, Financeiro discreto e Manutenção premium — com barra de progresso, mensagem, subtítulo, cores e botão configuráveis no EXE PRO. Cada site escolhe um modelo e pode sobrescrever mensagem/progresso sem alterar os demais sites.

## Portal do Cliente 3.8.0

A Cloud passa a oferecer um **Portal do Cliente** separado do painel administrativo. Cada acesso é vinculado a um único Cliente do CRM, com usuário/senha próprios e sessão HttpOnly separada. O portal exibe somente dados daquele cliente: visão geral, serviços por site, sites WordPress, financeiro quando permitido e projetos. Perfis disponíveis: Proprietário, Financeiro, Marketing e Visualizador. A rota atual é `/portal/`; o servidor também está preparado para servir o portal na raiz de `portal.exekuta.com.br` quando esse domínio for adicionado ao Cloudways/DNS.

## Portal Operacional 3.8.1

O Portal do Cliente passa a ter **Chamados**, **Arquivos**, **Comprovantes de Pagamento** e **Linha do Tempo**. Clientes podem abrir solicitações e responder conversas, compartilhar arquivos e enviar comprovantes vinculados a cobranças. A equipe recebe uma nova central **Atendimento Portal** para responder chamados, alterar status/prioridade/responsável, enviar arquivos e conferir comprovantes. Arquivos ficam no PostgreSQL em `BYTEA`, com limite de 8 MB e tipos permitidos. A linha do tempo reúne chamados, arquivos, projetos, financeiro e comprovantes conforme o perfil do usuário.

## Relatórios SEO + Portal 3.8.2

A Cloud passa a ter o módulo **Relatórios SEO**, com relatórios mensais por cliente/site, métricas de Search Console/GA4 inseridas manualmente ou por importação de palavras-chave CSV, PageSpeed Insights mobile/desktop, resumo executivo, destaques, próximas ações e publicação no Portal do Cliente. O Portal recebe uma nova área **Relatórios SEO**, com visualização por período, palavras-chave, performance técnica e botão **Imprimir / PDF**. A consulta PageSpeed usa a API oficial e pode funcionar sem chave; opcionalmente o Super Admin pode armazenar uma API key criptografada no `cloud_secrets`.

## Propostas + Contratos + Aceite no Portal 3.8.3

A Cloud passa a publicar propostas e contratos no Portal do Cliente. A equipe controla quais documentos ficam visíveis e acompanha o status de decisão. O cliente pode **aprovar/recusar propostas** e **aceitar/recusar contratos**, informando o nome completo e confirmando os termos. Cada decisão registra a versão exata do conteúdo por SHA-256, usuário do Portal, data/hora e hash do IP, sem armazenar o IP em texto puro. Alterações posteriores no documento fazem o sistema sinalizar que uma nova aprovação é necessária. O aceite eletrônico não é apresentado como assinatura digital qualificada ICP-Brasil.

## Financeiro Recorrente Avançado 3.8.4

A Cloud passa a gerar cobranças recorrentes a partir dos serviços mensais ativos do Cliente. Cada cliente pode ter perfil financeiro com vencimento, forma de pagamento, carência, multa, juros ao mês, desconto antecipado e geração automática. A cobrança pode consolidar todos os serviços em uma única fatura mensal ou gerar uma cobrança por serviço. A geração é idempotente por cliente/período e grava Recebíveis padrão do CRM, preservando a sincronização com Windows e integrando a régua de notificações. Pagamentos podem ser parciais ou integrais; o sistema mantém histórico de pagamentos, recalcula saldo e marca o Recebível como Parcial ou Pago. O Portal do Cliente exibe composição, pagamentos, desconto, encargos e saldo atualizado para perfis financeiros.


## Core Stability & Consolidation 3.9.0

A versão 3.9.0 consolida a camada operacional do EXE PRO sem reescrever os módulos existentes. O objetivo é reduzir risco de regressão e dar visibilidade ao estado real da aplicação.

### Registro de módulos

O build passa a validar um manifesto único de módulos:

- CRM / Sync Core;
- Notificações;
- WordPress Client Control;
- Portal do Cliente;
- Relatórios SEO;
- Financeiro Recorrente.

O build falha se um marcador crítico ou tabela essencial desaparecer durante uma atualização.

### Schedulers distribuídos

Os jobs automáticos de:

- Notificações;
- WordPress Control;
- Financeiro Recorrente;

passam a usar lock no PostgreSQL. Assim, se o Cloudways iniciar mais de um processo/instância, somente um processo executa cada job por janela. Isso reduz risco de execução simultânea e efeitos duplicados.

### Saúde do Core

Novo módulo **Saúde do Core** no painel Cloud:

- estado do PostgreSQL;
- tamanho do banco;
- integridade das tabelas;
- estado dos módulos;
- sessões ativas/expiradas;
- status das integrações;
- fila de notificações;
- sites WordPress com erro;
- chamados do Portal;
- relatórios SEO;
- perfis financeiros recorrentes;
- histórico de jobs;
- eventos técnicos;
- download de diagnóstico JSON sem segredos.

Admin/Super Admin podem executar os jobs manualmente. Super Admin pode executar limpeza segura de sessões expiradas, guards antigos e histórico técnico com mais de 90 dias.

### Build reforçado

O `build-check` agora:

- lê a versão diretamente do `package.json`;
- valida Admin, Portal e Server na mesma versão;
- valida o manifesto de módulos;
- confirma as tabelas essenciais no schema;
- verifica todos os JavaScript materializados com `node --check`;
- bloqueia schedulers antigos sem lock;
- imprime SHA-256 de `server.js`, `web/index.html` e `web/portal.html`.

### Compatibilidade

A cadeia incremental de patches foi mantida nesta versão por segurança de rollback. A consolidação 3.9.0 ocorre na camada de runtime, diagnóstico, locks, manifesto e validação do build, sem uma reescrita destrutiva do Core. PostgreSQL, IDs, sincronização Windows, Portal, WordPress e integrações existentes permanecem compatíveis.


## Tarefas, Equipe e SLA 3.9.1

A Cloud passa a ter o módulo **Tarefas & SLA**, integrado a Cliente, Projeto, Chamado e Portal do Cliente.

### Operação
Cada tarefa pode ter:

- cliente;
- projeto;
- chamado de origem;
- responsável da equipe;
- prioridade;
- status;
- prazo operacional;
- prazo de SLA;
- checklist;
- comentários;
- tempo trabalhado;
- visibilidade no Portal.

### SLA
O SLA é configurável por prioridade e usa horas corridas.

Padrões iniciais:

- Urgente: 4h;
- Alta: 8h;
- Normal: 24h;
- Baixa: 72h.

O painel classifica tarefas como:

- Dentro do prazo;
- SLA em atenção;
- SLA estourado;
- Concluído no prazo;
- Concluído fora do prazo.

### Equipe
O módulo usa os usuários ativos do EXE PRO como responsáveis e mostra:

- tarefas ativas por pessoa;
- SLA estourado por pessoa;
- tempo acumulado por pessoa;
- tarefas sem responsável.

### Chamados
Chamados do Portal podem virar tarefa com um clique. A tarefa fica vinculada ao chamado original e pode ser publicada no Portal.

### Portal do Cliente
Nova área **Acompanhamento**:

- tarefas publicadas;
- status;
- prazo;
- projeto;
- checklist público;
- percentual concluído;
- comentários do cliente/equipe.

O cliente pode comentar em tarefas publicadas. Se a tarefa estiver em **Aguardando cliente**, uma resposta do cliente devolve a tarefa para **Em andamento**.

### Cliente 360
O Cliente 360 passa a mostrar:

- tarefas ativas;
- tarefas em andamento;
- tarefas aguardando cliente;
- SLA estourado.

### Core 3.9
O módulo é registrado no manifesto do Core 3.9 e suas tabelas passam a fazer parte da verificação de integridade.

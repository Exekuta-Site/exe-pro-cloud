# EXE PRO v4.4.0 — Etapa 3: verificação dos backups reais do PostgreSQL

**Data da avaliação:** 24/11/2026  
**Estado:** **PENDENTE DE EVIDÊNCIA DO BANCO** — nenhuma conclusão de recuperabilidade é possível até localizar o serviço PostgreSQL e seu histórico de backup.  
**Ambiente:** `exe-pro-cloud` no Shard Cloud, PRODUÇÃO.  
**Modo:** somente leitura, sem SQL, sem restore, sem exportação e sem mudança de configurações.  
**Documento da etapa:** branch `auditoria/postgres-backups-etapa3`, baseada em `fix/prebuilt-startup-4.4.0`.

## 1. Evidências disponíveis — fatos e limitações

| Questão | Evidência disponível | Conclusão atual |
| --- | --- | --- |
| Banco utilizado pelo aplicativo | `lib/postgres.js` utiliza driver `pg` e configuração PostgreSQL. Relatório de auditoria Shard Cloud descreve banco gerenciado. | PostgreSQL identificado na arquitetura; **a instância exata não foi confirmada neste turno**. |
| Backups do aplicativo | Relatório Shard Cloud enviado pelo proprietário registra `exe-pro-cloud` em 03/11/2026 e `App Exekuta` em 23/11/2026. Ambos com campo `database_name` vazio e `is_vm: false`. | **Não há comprovação de que os backups de arquivos contenham o PostgreSQL.** |
| Backup do banco PostgreSQL | Backup ZIP disponibilizado pelo proprietário não contém dump identificado do PostgreSQL. Sem acesso autenticado ao dashboard da instância de banco. | **NÃO COMPROVADO**: não significa que o banco esteja sem backup. |
| Último backup PostgreSQL bem-sucedido | Nenhum registro do serviço de banco disponibilizado. | **NÃO VERIFICADO** |
| Backups automáticos habilitados | Nenhuma tela das configurações do banco apresentada. | **NÃO VERIFICADO** |
| Retenção e local de armazenamento | Nenhuma evidência da política aplicada à instância. | **NÃO VERIFICADO** |
| Integridade e teste real de restauração | Nenhum relatório de restore isolado apresentado. | **NÃO VERIFICADO** |
| PITR / RPO / RTO | Não demonstrados por evidência da instância nem testes. | **NÃO VERIFICADO** |

**Importante:** a página pública do Shard Cloud diferencia backups do app, do banco de dados e de VPS. Afirma que backups manuais podem ser criados pelo painel do próprio recurso; backups automáticos ficam disponíveis a partir do plano Pro **quando ativados** e têm cadência diária. Informa até oito slots para aplicação/banco e que os pontos permanecem até exclusão. Isso é capacidade pública da plataforma, **não comprova política, frequência ou backups efetivos da instância EXE PRO**.

Fontes públicas:
- https://shardcloud.app/pt-br/resources/backups
- https://shardcloud.app/pt-br/resources/databases

## 2. Procedimento estritamente de leitura para o proprietário

1. Entrar no **dashboard principal** do Shard Cloud.
2. Abrir **Bancos de Dados** (não a aba Backups do aplicativo).
3. Identificar a instância **PostgreSQL associada ao EXE PRO**, sem revelar `DATABASE_URL`, host completo, usuário, senha ou porta privada.
4. Abrir essa instância e selecionar a área **Backups**.
5. Examinar a lista e anotar, para cada ponto existente, **tipo/escopo, data e hora com fuso, status e identificação não secreta**, sem clicar em Restaurar/Excluir.
6. Examinar, somente em modo de leitura, se há **backup automático habilitado**, cadência, retenção, limite de cópias e disponibilidade de recuperação em ponto no tempo. Se o painel não exibir, registrar `Não informado`.
7. Produzir captura de tela **com segredos, URIs de conexão e informações pessoais ocultos**; compartilhar somente metadados de backup, nunca o conteúdo de um backup.
8. Se não houver uma instância listada ou o banco for externo à conta, registrar esse impedimento. **Não criar banco nem conectar ferramentas externas.**

### Campos para registro das evidências recebidas

| Evidência | Valor | Verificação |
| --- | --- | --- |
| Identificador não sensível da instância PostgreSQL | Pendente | Não verificado |
| Backup de banco mais recente — data/hora | Pendente | Não verificado |
| Status do backup de banco | Pendente | Não verificado |
| Tipo: manual / automático / snapshot / export | Pendente | Não verificado |
| Políticas aplicadas: frequência e retenção | Pendente | Não verificado |
| Inclusão das tabelas relevantes | Pendente | Não verificado |
| PITR e janela de recuperação, se aplicáveis | Pendente | Não verificado |
| Restore em instância **isolada** e relatório de integridade | Pendente | Não verificado |

## 3. O que se pode concluir com cada evidência

- **Backup identificado:** uma linha no painel indica que há um ponto registrado para a instância de banco. Isso ainda não demonstra que ele é recuperável.
- **Backup do banco comprovado:** registro de execução bem-sucedida, destino PostgreSQL identificado e escopo, data/hora e política verificados.
- **Recuperabilidade comprovada:** procedimento de restauração executado **em uma instância separada** (somente em etapa futura com autorização específica), com evidência de banco aberto, estrutura/tabelas verificadas e consistência demonstrada sem revelar dados pessoais.
- **Sem informação ou inconclusivo:** manter o risco em aberto. Não interpretar ausência de dump no ZIP do aplicativo como ausência de backups no serviço do banco.

## 4. Limites e proteção da produção

**Não executar:** backup novo, restore, exclusão, SQL no banco de produção, exportação de linhas ou dump, migração, deploy, reinicialização, modificação de secrets ou ativação de políticas.

**Não incluir no GitHub:** `.env`, strings de conexão, tokens, dumps, arquivo de backup com clientes, capturas contendo credenciais ou tabelas de dados pessoais.

**Regra de liberação:** a verificação de disponibilidade/recuperabilidade do PostgreSQL é condição pendente para considerar futuras publicações no Shard Cloud; PRs atuais permanecem como rascunho, sem merge e sem deploy.

## 5. Próximas ações

1. Receber uma captura da aba **Bancos de Dados → PostgreSQL → Backups** referente à instância correta.
2. Atualizar esta tabela com evidências objetivas, separando confirmado, provável e não verificado.
3. Caso não haja backups do banco, planejar política de proteção e criação de um backup **somente após autorização separada**.
4. Se houver backups, planejar **restore de prova em ambiente isolado**, com janela, acesso e proteção de dados previamente aprovados.

**Conclusão nesta data:** documentação e roteiro criados no GitHub; **o backup real do PostgreSQL e sua restaurabilidade seguem não comprovados**. Não houve nenhuma alteração no Shard Cloud ou no PostgreSQL.

## 6. Etapa 3B — inspeção do painel da instância PostgreSQL (24/11/2026)

**Status: INICIADA; aguardando captura do painel do banco.** Esta etapa não autorizou comandos, criação de backups, restaurações nem mudanças na produção.

### Validação da origem

- Repositório `Exekuta-Site/exe-pro-cloud` confirmado como **Private**.
- PR #3 segue como **rascunho** sobre a branch de auditoria. Nenhum merge ou deploy foi solicitado.
- A conexão disponível nesta conversa permite auditoria do GitHub, mas **não fornece acesso autenticado ao painel PostgreSQL do Shard Cloud**; portanto, não houve consulta direta aos backups reais.
- A Shard Cloud declara que backups de aplicações e backups de bancos são gerenciados no contexto de seus respectivos recursos. Há backups manuais e automáticos para recursos elegíveis; essa informação pública **não comprova** a configuração ou o histórico desta instância específica.

### Inspeção solicitada ao proprietário (somente leitura)

1. Abrir a página principal do Shard Cloud e procurar **Bancos de Dados** (sair dos detalhes da aplicação `exe-pro-cloud`).
2. Selecionar a instância PostgreSQL que atende o EXE PRO, sem copiar credenciais.
3. Abrir **Backups** e registrar datas, status e se o ponto pertence ao banco, não ao app.
4. Se houver tela de configurações, apenas consultar se existe backup automático habilitado, frequência, retenção e recuperação para ponto no tempo; não ativar nada.
5. Enviar print com credenciais, URLs de conexão e dados pessoais ocultos. Se não encontrar o menu, enviar somente a navegação do painel sem valores secretos.

### Evidência parcial recebida

| Campo | Valor/estado |
| --- | --- |
| Nome identificável não sensível da instância | `exe-pro-db` — confirmada na tela do serviço PostgreSQL, ambiente PRODUCTION, Online (1/1 nós) |
| Último backup PostgreSQL com sucesso | Não verificado |
| Automaticidade / frequência | Não verificado |
| Retenção real da instância | Não verificado |
| PITR | Não verificado |
| Restore em instância isolada | Não realizado; exige autorização separada |

Próxima atualização deste documento ocorrerá **após o recebimento da evidência visual**. Não concluir que o backup existe, falta ou é restaurável a partir de páginas genéricas da plataforma.

Referências públicas: https://shardcloud.app/pt-br/resources/backups e https://shardcloud.app/pt-br/resources/databases.

## 7. Evidência visual — instância localizada (24/11/2026)

O proprietário apresentou captura de tela da aba **Projeto** da instância Shard Cloud com nome **`exe-pro-db`**. O recurso está identificado como **POSTGRES Database**, ambiente **PRODUCTION**, estado **Online (1/1 nós)**. A interface exibe **71 MB utilizados de 8 GB**. O nome é compatível com o banco esperado do EXE PRO, mas a associação técnica exata com a aplicação não foi demonstrada por uma configuração de conexão (que não deve ser compartilhada).

**Constatação permitida:** existe uma instância PostgreSQL de produção denominada `exe-pro-db` acessível no painel do proprietário.

**Constatação NÃO permitida:** a captura ainda **não mostra o conteúdo da aba Backups**; não confirma backup executado, sucesso, data, frequência, retenção, PITR ou recuperabilidade. O estado do banco como Online não comprova existência de backup.

**Próxima evidência solicitada:** clicar apenas na aba **Backups** dessa instância e enviar captura da listagem de pontos/estados e, se disponível, configuração de automação. Não clicar em Restaurar, Excluir nem Criar Backup. Não compartilhar credenciais, dumps ou dados pessoais.

Nenhuma alteração foi efetuada no banco de produção ou nos recursos do Shard Cloud.

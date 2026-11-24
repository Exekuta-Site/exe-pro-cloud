# EXE PRO v4.4.0 — Etapa 3: verificação dos backups reais do PostgreSQL

**Data da avaliação:** 24/11/2026  
**Estado atualizado após evidência de 24/11/2026:** **UM BACKUP POSTGRESQL LISTADO E DISPONÍVEL NO PAINEL; RECUPERABILIDADE NÃO COMPROVADA.** A instância `exe-pro-db` foi localizada, mas integridade e restauração isolada ainda não foram verificadas.  
**Ambiente:** `exe-pro-cloud` no Shard Cloud, PRODUÇÃO.  
**Modo:** somente leitura, sem SQL, sem restore, sem exportação e sem mudança de configurações.  
**Documento da etapa:** branch `auditoria/postgres-backups-etapa3`, baseada em `fix/prebuilt-startup-4.4.0`.

## 1. Evidências disponíveis — fatos e limitações

| Questão | Evidência disponível | Conclusão atual |
| --- | --- | --- |
| Banco utilizado pelo aplicativo | `lib/postgres.js` utiliza driver `pg` e configuração PostgreSQL. Relatório de auditoria Shard Cloud descreve banco gerenciado. | PostgreSQL identificado na arquitetura; **a instância exata não foi confirmada neste turno**. |
| Backups do aplicativo | Relatório Shard Cloud enviado pelo proprietário registra `exe-pro-cloud` em 03/11/2026 e `App Exekuta` em 23/11/2026. Ambos com campo `database_name` vazio e `is_vm: false`. | **Não há comprovação de que os backups de arquivos contenham o PostgreSQL.** |
| Backup do banco PostgreSQL | Captura posterior do proprietário, aba **Backups** de `exe-pro-db`, mostra **1/8 backup disponível**, entrada com data **24/11/2026 11:20:52** e ações Restaurar/Download. O ZIP do aplicativo continua sem dump de banco. | **BACKUP LISTADO NO PAINEL.** Conteúdo, integridade e recuperação não testados. |
| Último backup PostgreSQL bem-sucedido | Há um único registro visível de backup disponível com ícone de confirmação e horário exibido de 24/11/2026 11:20:52. | **DISPONIBILIDADE CONFIRMADA NA INTERFACE**; execução e integridade não validadas independentemente. |
| Backups automáticos habilitados | A captura mostra o bloco Backup Automático com chave aparentemente desligada e indicação de recurso PRO/Enterprise. | **NÃO HÁ EVIDÊNCIA DE AUTOMÁTICO ATIVO**; plano e política efetivos não confirmados. |
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
| Backup PostgreSQL disponível no painel | 1 de 8; registro `exe-pro-db / EXE-PRO-DB`, 24/11/2026 11:20:52; recuperabilidade não verificada |
| Automaticidade / frequência | Recurso de Backup Automático aparece sem indicação de estar ativado; frequência não verificada |
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

## 8. Evidência visual — backup PostgreSQL listado (24/11/2026)

**Origem:** captura enviada pelo proprietário da aba **Backups** da instância `exe-pro-db` no Shard Cloud. Esta atualização diferencia a observação atual das seções 1–7, que registram o estado anterior à apresentação da captura. Não houve acesso direto ao serviço nem testes de recuperação.

### Observações verificadas na captura

- **Recurso:** `exe-pro-db` (PostgreSQL) com indicador **Online (1/1 nós)** no cabeçalho.
- **Histórico:** a interface informa **`1/8 backup disponível`** e exibe uma entrada `exe-pro-db / EXE-PRO-DB`.
- **Horário exibido:** **24 de novembro de 2026, 11:20:52**. O fuso horário desse timestamp não aparece explicitamente na captura; não inferir UTC.
- **Estado na interface:** entrada com ícone de check e ações **Restaurar**, **Download** e **Excluir**; portanto existe um backup **listado como disponível**. O ícone não é teste de integridade.
- **Backup Automático:** bloco informativo `Ative para criar backups automáticos da sua database periodicamente`, indicação de funcionalidade PRO/Enterprise, controle aparentemente desativado. **Não há evidência de uma política automática ativa nem de sua cadência**.
- **Escopo e tamanho do backup, local de armazenamento, retenção efetiva, checksum, PITR, conclusão de jobs e teste de restauração:** **não verificados**.
- **Nenhum backup foi baixado, criado, excluído ou restaurado por esta auditoria.**

### Conclusão atualizada e limites

**CONFIRMADO:** existe ao menos **uma entrada de backup do PostgreSQL listada como disponível** no painel do serviço `exe-pro-db`. O risco de ausência de qualquer registro de backup é reduzido, mas não eliminado quanto à efetiva recuperabilidade.

**NÃO COMPROVADO:** restauração bem-sucedida em banco isolado, recuperação de dados e integridade, cobertura das tabelas, periodicidade automática, retenção e eventual PITR.

**Recomendação:** manter PRs em rascunho, não realizar deploy; a próxima fase deve verificar em modo de leitura as condições de retenção e automação, sem ativar controles, baixar dumps ou revelar credenciais. Um teste de restore deve exigir aprovação expressa futura e ambiente separado.

**Nota de rastreabilidade:** este registro é evidência fornecida pelo proprietário via captura. Não significa que o ChatGPT tenha acesso autenticado ao dashboard do Shard Cloud.

## 9. Evidência de assinatura Core 1 — elegibilidade para backup automático (24/11/2026)

**Evidência fornecida pelo proprietário nesta conversa:** o plano contratado do Shard Cloud é **Core 1**. O usuário informou diretamente o nome do plano; não houve captura do faturamento ou acesso ao cadastro da conta.

**Documentação pública consultada em 24/11/2026:** a página oficial [Backups para Apps, Bancos e VPS](https://shardcloud.app/pt-br/resources/backups) informa que os backups **manuais** são disponibilizados a partir dos painéis dos recursos, e que os backups **automáticos** estão disponíveis **a partir do plano Pro**, com execução diária quando ativados. A [comparação oficial de planos](https://shardcloud.app/pt-br/resources/plan-comparison) confirma o backup automático como diferencial do Pro versus Core.

### Conclusão de elegibilidade e proteção atual

| Item | Estado apurado | Base |
| --- | --- | --- |
| Plano do proprietário | **Core 1** | Informação expressa do proprietário, não auditada na cobrança |
| Backup automático nativo do PostgreSQL | **Não incluído no plano Core** | Regra pública oficial Shard Cloud: a partir do Pro; tela do banco informa PRO & Enterprise |
| Backup manual disponível | **Sim** | Painel exibe ação 'Realizar cópia de segurança' e histórico com 1/8 cópias |
| Último registro de backup do PostgreSQL | **24/11/2026 11:20:52, listado como disponível** | Captura da aba Backups de `exe-pro-db` |
| Backup automático ativo no banco | **Sem evidência; não disponível pelo plano Core 1** | Plano informado + regras oficiais |
| Backup restaurável comprovado | **Não** | Nenhum teste em instância isolada, integridade não verificada |
| Retenção efetiva e limite operacional | **8 slots observados; expiração/ciclo e política da instância não verificados** | Painel 1/8; página pública informa permanência até exclusão, mas não uma política efetiva da conta |

### Conduta recomendada sem modificar produção

1. **Não alterar assinatura nem ativar backup automático** nesta auditoria.
2. **Manter intacto o backup existente** (24/11/2026) e não apagar cópias para abrir slots sem uma política aprovada.
3. Estabelecer **rotina manual de backups** em frequência proporcional à taxa de mudanças do CRM (mínimo antes de cada alteração/deploy; backups entre alterações frequentes devem ter cadência definida com o proprietário). O registro de um backup isolado não protege contra perda posterior de dados.
4. Planejar revisão futura de retenção e proteção fora da conta, respeitando sigilo dos registros e capacidade de restauração.
5. Se a exigência for backup diário automático nativo, **avaliar** o plano Pro com custo e condições atualizados; não efetuar upgrade sem autorização específica.
6. Exigir homologação de restauração em instância **isolada**, após aprovação separada e sem expor dados pessoais, antes de declarar recuperabilidade comprovada.

**Estado da Etapa 3C:** requisito de plano/elegibilidade **esclarecido**; integridade e recuperabilidade **ainda pendentes**. Nenhuma escrita no PostgreSQL, alteração de assinatura, restauração, backup novo ou deploy foi realizada.

## 10. Etapa 3D — plano de proteção do Core 1 (24/11/2026)

**Planejamento concluído; implantação NÃO autorizada e NÃO executada.**

Foi criado o documento operacional [Etapa 3D — Plano de proteção PostgreSQL no Core 1](./ETAPA-3D-PLANO-PROTECAO-POSTGRESQL-CORE1-2026-11-24.md), contendo:

- Frequência manual proposta: **diária às 19h de Brasília (UTC−3)**, inclusive fins de semana, com responsável e substituto a designar; backup adicional antes de alterações de risco.
- Gestão dos **oito slots do painel**: até sete cópias recentes e reserva de uma vaga pré-release, sem apagar o ponto de 24/11/2026 sem aprovação e evidência de substitutos.
- Política externa proposta: **7 diárias, 4 semanais e 3 mensais** sob criptografia, controle de acesso/MFA, armazenamento independente e conferência SHA-256 de artefatos criptografados.
- **RPO visado ≤24h** somente se houver execução bem-sucedida a cada 24h. **RTO não conhecido**, a medir no primeiro teste de restauração isolada.
- Runbook futuro de restauração em **PostgreSQL separado**, incluindo isolamento de jobs e integrações, verificação de integridade e descarte seguro; exige autorização expressa específica.
- Não foram criados backups nem realizados downloads, restores, deleções, deploys, alterações de assinatura ou comandos no banco.

**Risco pendente:** o único backup listado como disponível ainda **não foi testado** quanto à integridade/recuperabilidade. A rotina diária e cópias externas continuam apenas como **plano**, não proteção ativa.

**Próxima decisão sugerida:** revisar calendário, responsável, retenção e destino externo; então definir uma etapa operacional futura com autorizações separadas. PR #3 permanece em rascunho e sem merge.

## 11. Etapa 3E — política operacional e comparação de custos (24/11/2026)

**Documento concluído:** [Etapa 3E — Política operacional Core 1 e custos](./ETAPA-3E-POLITICA-OPERACIONAL-CORE1-CUSTOS-2026-11-24.md).

- **Papéis definidos por função, ainda sem pessoas designadas:** administrador principal aprova; operador de backup executa a rotina; substituto cobre ausências; custodiante das chaves protege criptografia; técnico só atua em restores isolados expressamente autorizados.
- **Horário proposto:** 19h de Brasília diariamente, inclusive fins de semana/feriados, com checagem/escalação às 19h30. **Nenhum agendamento ou lembrete foi criado.**
- **Retenção proposta:** 7 versões diárias, 4 semanais, 3 mensais **fora da Shard Cloud**; até 7 backups recentes + 1 vaga pré-deploy nos 8 slots do painel, exigindo política de rotação sob autorização separada. **Nenhuma exclusão foi autorizada.**
- **Armazenamento externo em avaliação:** Cloudflare R2 Standard privado como preferência; Backblaze B2 privado como alternativa. Ambos mostram franquia gratuita de 10 GB (condições diferem). Custos em cenários de 14 backups de 100 MB / 1 GB / 5 GB por arquivo: R2 aproximadamente US$0 / US$0,06 / US$0,90 por mês; B2 US$0 / US$0,03 / US$0,42, excluindo trabalho humano, impostos, operações extras, custos de transferência e eventual contratação. **71 MB de uso do DB não comprova tamanho de backup.**
- **Regra de confidencialidade:** criptografia antes do upload, MFA, bucket privado, chave separada e plano de recuperação da chave; revisar legislação e contrato antes de transferir dados.
- **Recuperabilidade:** continua **não comprovada** até realizar restore documentado em banco isolado com aprovação futura.
- **Sem alterações reais:** nenhuma criação/download/restore/exclusão de backup, nenhuma conta/bucket externo, nenhum upgrade, nenhum deploy ou comando no banco.

**Próxima decisão:** na Etapa 3F, atribuir pessoas às funções, aceitar ou ajustar horário e escolher storage para preparação. Essa decisão não autorizará transferências de dados nem operações no Shard Cloud.

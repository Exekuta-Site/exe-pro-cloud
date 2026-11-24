# EXE PRO v4.4.0 — Etapa 3D: plano de proteção PostgreSQL no Shard Cloud Core 1

**Data de elaboração:** 24/11/2026 · **Estado:** plano documental aprovado para elaboração, **não executado**.  
**Escopo:** instância PostgreSQL de produção `exe-pro-db`, relacionada operacionalmente ao EXE PRO.  
**Plano declarado pelo titular:** Shard Cloud **Core 1**.  
**Repositório:** `Exekuta-Site/exe-pro-cloud`, branch `auditoria/postgres-backups-etapa3` (PR #3, rascunho).  
**Proibições desta etapa:** não criar/baixar backup, não restaurar, não excluir backup, não alterar plano, não configurar rotina automática, não fazer SQL, não migrar, não publicar e não reiniciar.

## 1. Evidências e limites conhecidos

1. O titular apresentou a aba **Backups** de `exe-pro-db`: **1/8 backup disponível**, entrada `exe-pro-db / EXE-PRO-DB` datada de **24/11/2026 às 11:20:52** (fuso da própria interface não explicitado); existem ações de **Restaurar**, **Download** e **Excluir**.
2. O recurso de backup automático é apresentado como exclusivo de **Pro & Enterprise**; o titular informou estar no **Core 1**. Logo, backups automáticos nativos não estão incluídos na assinatura declarada.
3. Página pública da Shard Cloud: até **8 backups por aplicação ou banco** e os backups **permanecem até exclusão**; permite criar backup manual no painel do recurso; automação do provedor exige Pro ou superior. **Não inferir política de retenção ou integridade específica da instância a partir dessa página.**
4. **Não há teste de restauração nem de leitura do conteúdo deste backup.** O ícone de confirmação e o status "disponível" no painel não demonstram recuperabilidade. Não se conhecem o tamanho do arquivo, formato de export, checksum, versão do PostgreSQL, extensão dos dados/roles, PITR, RTO ou latência de recovery.
5. **Nenhum backup do banco foi enviado ao ChatGPT nem ao GitHub**. O backup ZIP anterior era de arquivos do aplicativo e não comprovava o banco.

Fontes públicas consultadas na elaboração:
- https://shardcloud.app/pt-br/resources/backups
- https://shardcloud.app/pt-br/resources/plan-comparison
- https://www.postgresql.org/docs/current/backup.html
- https://www.postgresql.org/docs/current/app-pgrestore.html

## 2. Objetivos e responsabilidades

- **RPO pretendido:** até **24 horas**, condicionado à execução e sucesso de **um backup a cada 24 horas, inclusive fins de semana/feriados**. Se a rotina falhar, o RPO de fato cresce; não é uma garantia do Core 1.
- **RTO:** **não definido/não comprovado**. Medir no primeiro teste de restore isolado e aprovar uma meta operacional compatível com o negócio.
- **Responsável:** proprietário ou operador previamente designado. **Substituto:** designar pessoa habilitada para cobrir ausências. Sem responsável nos fins de semana, a política diária não estará cumprida.
- **Escalonamento:** backup não executado até a janela combinada, erro no painel, atraso de cópia externa ou menos de dois pontos seguros devem gerar registro e aviso ao responsável (canal e automação ainda a definir; não foi criada nenhuma tarefa agendada).
- **Princípio:** backup de banco `exe-pro-db` separado de backup do aplicativo `exe-pro-cloud`; snapshots do app não substituem backup de CRM/portal.

## 3. Rotina manual proposta (NÃO ativada)

| Momento | Ação operacional futura, sujeita a autorização de execução | Verificação e registro |
| --- | --- | --- |
| **Diariamente, 19h de Brasília (UTC−3)** | Operador realiza manualmente um backup de `exe-pro-db` no painel **Backups** | Identificador não secreto, data/hora, estado disponível, responsável, divergências e eventual falha |
| **Após criação diária** | Operador verifica sucesso no painel e, se a política externa for autorizada, protege cópia em ambiente independente | Não registrar conteúdo dos dados; confirmar hash/armazenamento do objeto criptografado |
| **Antes de deploy, migração, importação em massa ou mudança de esquema** | Gerar ponto de recuperação específico *após autorização operacional* e confirmar antes de liberar alterações | Evidência do ponto, do ticket e da aprovação do deploy |
| **Semanalmente** | Revisar histórico de execução, slots, disponibilidade externa e registros de falhas | Relatório sintético sem dados de clientes |
| **Mensalmente** | Revisar crescimento do banco, espaço, credenciais do repositório externo, retenção e meta RPO/RTO | Revisão documentada, riscos abertos e aprovação de ajustes |
| **Após incidente ou restauração comprovada** | Preservar evidência e reavaliar a política | Nunca restaurar o banco de produção sem plano e autorização separados |

O horário das 19h é **sugestão inicial**; ajustar à operação real. Se houver carga de dados valiosa a cada hora, RPO diário pode ser insuficiente; considerar backups mais frequentes por operação ou capacidade automática paga, mediante análise de custo/risco.

### Regra explícita para os 8 slots da Shard Cloud

- **Estado observado:** 1/8, com a cópia de 24/11/2026 como referência inicial **ainda não testada**.
- **Distribuição operacional pretendida:** até **7 pontos recentes** + **1 vaga operacional para backup pré-release**. Ajustar quando o calendário de deploys consumir a reserva.
- **Não presumir rotação automática:** a plataforma indica permanência até exclusão; a manutenção do limite exigirá decisão humana quando estiver cheio.
- **Nenhuma exclusão está autorizada nesta etapa.** Jamais apagar o último ponto disponível, o único backup pré-incidente, ou um ponto ainda necessário para recuperação.
- **Política futura de expurgo:** somente com confirmação da existência de cópias mais recentes no painel, **ao menos uma cópia externa protegida e testável**, regras de retenção aceitas e **aprovação de exclusão separada**, após verificar que não há incidente/retention hold.
- Se todos os 8 slots estiverem ocupados antes de novo backup, **suspender deploy ou operação de risco** até resolver capacidade/retention com autorização; não excluir backups automaticamente.

## 4. Retenção fora do painel (PROPOSTA, não aplicada)

**Objetivo:** reduzir dependência do mesmo provedor, conta e falhas humanas.

| Classe de cópia externa | Proposta de retenção | Notas |
| --- | --- | --- |
| Diária | 7 versões recentes | Uma versão válida por dia; distinguir falha de execução |
| Semanal | 4 versões semanais | Cópia de referência selecionada da semana, em armazenamento independente |
| Mensal | 3 versões mensais | Arquivo de recuperação de prazo maior |
| Pré-release / incidente | Conforme janela de mudança e exigências legais | Nunca excluir durante investigação ou antes de aprovação |
| Cópia no painel Shard Cloud | No máximo 8 slots | Não apagar o único backup identificado nem assumir expiração automática |

A retenção de 7/4/3 é uma **política inicial recomendada**, a confirmar contra obrigações contratuais, LGPD, capacidade, custos e crescimento. Não representa retenção já contratada nem implícita na Shard Cloud.

### Proteção da cópia externa

1. Escolher **armazenamento independente da conta Shard Cloud**, preferencialmente com versionamento, proteção contra exclusão quando disponível, autenticação multifator e contas com privilégio mínimo.
2. O conteúdo do dump/export pode conter **dados de clientes, credenciais derivadas, tickets, pagamentos, tokens de integração e arquivos do portal**. Tratá-lo como informação confidencial; não compartilhar em chats, tickets públicos, GitHub, e-mail desprotegido nem dispositivos sem disco criptografado.
3. **Criptografar antes de enviar ao armazenamento externo**, usando ferramenta confiável, algoritmos modernos e chave fora do repositório de código. Armazenar chaves em cofre de segredos, com acesso restrito e processo testado de recuperação de chave.
4. Utilizar transferência segura (TLS); registrar **SHA-256 do artefato criptografado** e seu tamanho, com data/hora, classe de retenção e status de upload. O hash é evidência de integridade/transporte, **não substitui restore**.
5. Restringir quem pode **ler, baixar, alterar ou excluir** backups. Habilitar MFA e logs de acesso no provedor escolhido; nunca armazenar chaves e dumps no mesmo local sem separação de permissões.
6. Para maior resiliência, aplicar o princípio **3-2-1** progressivamente (dados ativos, backup do serviço e cópia independente; avaliar um segundo meio distinto).
7. Não ativar exportações, pipelines de nuvem, conectores ou downloads sem aprovação explícita e confirmação de que o formato baixado é recuperável em ambiente separado.

## 5. Plano futuro de teste de restauração isolada — DOCUMENTAL

**Pré-condições obrigatórias e ainda pendentes:**
- Autorização específica do proprietário para criar/usar instância de **homologação isolada** e para usar uma cópia confidencial do banco.
- Aprovação de orçamento, permissões, período de retenção dos dados de teste e prazo de descarte.
- Confirmar versão do PostgreSQL de origem e compatibilidade do destino, formato do backup, requisitos de roles, extensions, owners e encoding.
- Criar política de acesso e rede com **bloqueio de tráfego de integração**, nenhum serviço de WhatsApp/e-mail/Google Ads/WordPress, nenhuma ligação com sistemas de produção; desativar agendamentos e notificações nesse ambiente.
- Não usar a ação de **Restaurar** no banco `exe-pro-db`. A execução futura deverá apontar explicitamente para **outro destino** identificado e verificado antes de qualquer confirmação.

**Roteiro para execução futura após aprovação:**

1. **Selecionar evidência:** escolher o backup identificado, confirmar sucesso no painel e registrar data/hora, escopo e identificador não secreto.
2. **Preparar destino separado:** instância PostgreSQL vazia e isolada, com permissões mínimas e compatibilidade de versão; validar que nenhum DNS/endpoint/credencial de produção está conectado.
3. **Obter cópia autorizada:** quando suportado, baixar por canal seguro, identificar formato e documentar checksum e tamanho; guardar a cópia somente em armazenamento temporário protegido. Não enviar dados à conversa nem ao GitHub.
4. **Inspecionar formato:** se o arquivo for arquivo nativo de `pg_dump` (custom/directory/tar), considerar `pg_restore` e seus recursos de listagem/verificação. Se for SQL plano ou formato proprietário do provedor, adaptar procedimento e validar capacidade de importar **em destino separado**. **Não assumir que todo download do Shard Cloud é compatível com `pg_restore`.**
5. **Restaurar no destino isolado:** realizar somente a operação aprovada; registrar sucesso, erros, duração e configuração do alvo; interromper se houver indício de destino incorreto.
6. **Verificar consistência sem expor dados:** existência de tabelas esperadas, índices/chaves, migrações, contagens agregadas e presença das entidades CRM/portal/financeiro. Comparar com critérios previamente acordados sem publicar registros pessoais, senhas ou tokens.
7. **Testar aplicação apenas em homologação desconectada:** realizar smoke tests de leitura e login com dados de teste, sem enviar mensagens, cobranças, notificações ou modificar clientes existentes.
8. **Medir e registrar:** recuperação bem-sucedida ou falha, RTO real, ponto de recuperação mais recente (RPO observado), lacunas de dados, versão/ambiente de teste e medidas corretivas.
9. **Descarte seguro:** revogar acessos temporários, remover dados de teste segundo política autorizada, registrar conclusão, sem afetar o banco de produção.

**Critério de sucesso da recuperabilidade:** restore completo e consistente **no banco isolado**, com evidência de esquema, componentes críticos e teste de aplicação; hash e botão de download, sozinhos, não são suficientes.

**Nota de segurança:** arquivos de backup podem conter SQL e objetos definidos por usuários privilegiados; não restaurar dumps de origem não confiável sem inspeção. Ver documentação oficial do PostgreSQL.

## 6. Registros operacionais e indicadores (modelo)

Em documentos privados **sem informações sensíveis**, registrar para cada execução futura:

| Data/hora | Tipo/identificador não secreto | Status painel | Cópia externa verificada? | Hash do arquivo criptografado? | Responsável | Falhas/ações |
| --- | --- | --- | --- | --- | --- | --- |
| 24/11/2026 11:20:52 (fuso não exibido) | Histórico Shard: `exe-pro-db / EXE-PRO-DB` | 1/8 disponível | Não verificado | Não verificado | Não informado | Restore não testado |
| A preencher | Diário / pré-release / semanal | A preencher | A preencher | A preencher | A preencher | A preencher |

Indicadores a acompanhar: idade do último backup **bem-sucedido**, lacunas no calendário, quantidade de slots livres, última cópia externa íntegra, último restore testado, RPO observado, RTO medido, taxa de falhas e custos de armazenamento.

## 7. Decisões para a próxima autorização (sem executar agora)

- [ ] Validar se RPO de até 24h é suficiente para o volume atual de alterações de clientes, leads, financeiro e portal.
- [ ] Designar responsável e substituto para executar backups **todos os dias**, inclusive finais de semana, caso se escolha a política diária.
- [ ] Aprovar horário e quantidade das retenções 7/4/3, armazenamento externo e estimativa de custos.
- [ ] Definir responsável e controle de acesso às chaves de criptografia.
- [ ] Aprovar **separadamente** um teste de restauração em instância isolada, com custos, rede, bloqueio de jobs e descarte.
- [ ] Reavaliar no futuro se o esforço manual é aceitável ou se a automatização nativa do Pro compensa; **nenhum upgrade automático**.

## 8. Situação da execução nesta etapa

- **Concluído:** plano escrito, documentado e vinculado à Etapa 3D.
- **Não executado:** novo backup, download, cópia externa, criptografia, ativação automática, exclusão, teste de restauração, migração, deploy, mudança de plano.
- **Produção:** nenhum serviço ou banco alterado.
- **Bloqueios remanescentes:** backup isolado **disponível no painel**, porém integridade/recuperabilidade não comprovadas; política operacional e custódia externa ainda não implementadas.

**Liberação de operações:** exigirá aprovação expressa em etapa separada. Este documento não é autorização para criar/excluir/restaurar backups, tratar dados de clientes nem configurar produção.

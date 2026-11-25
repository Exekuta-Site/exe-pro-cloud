# EXE PRO v4.4.0 — Revisão consolidada de prontidão dos PRs #1–#7

**Data:** 25/11/2026 · **Classificação:** parecer técnico somente documental · **Decisão:** `APROVADO PARA CONTINUAR PREPARAÇÃO DE HOMOLOGAÇÃO ISOLADA`, **NÃO LIBERADO PARA MERGE/DEPLOY**.  
**Fonte:** estado dos PRs, diffs, relatórios e CI verificados no repositório privado `Exekuta-Site/exe-pro-cloud`.  
**Ramo deste relatório:** `test/prebuilt-disposable-dependency-lab-4.4.0` (PR #7; rascunho), sem abrir mais PR.

## 1. Resumo executivo verificado

- **PRs #1 a #7:** todos `OPEN`, **`draft=true`**, **`merged=false`**. Nenhum merge foi realizado nesta revisão.
- **`main` não alterada:** SHA observado `839f478a0a5612412ff355f5cadf987ddcc90fa8`.
- **CI exato da HEAD:** PRs #2, #3, #4, #5, #6 e #7 têm execução GitHub Actions `completed/success`. **PR #1 não tem execução própria registrada na branch**; seus testes foram executados em laboratório isolado (13/13) e a alteração está herdada nos ramos subsequentes.
- **Sem testes integrados reais de aplicação:** não foram iniciados `node server.js`, `npm start`, `start:prebuilt`; nenhum login/Portal/`/ready` foi exercitado contra um servidor funcionando. Nenhum PostgreSQL foi acessado, nenhuma migração foi realizada.
- **Status prebuilt:** manifesto schema 2 e pacote com **93 arquivos protegidos + manifesto**, transporte de tar.gz validado e `npm ci --ignore-scripts` concluído no runner descartável. Isso **não é** atestado de autenticação, disponibilidade ou adequação ao ambiente de produção.
- **Backup PostgreSQL:** o registro visual anteriormente apresentado na Shard Cloud apontava um backup disponível em 24/11/2026, sem teste de restauração. O planejamento **adicional** de backups foi encerrado pelo proprietário e **não será reaberto** como tarefa desta revisão.
- **CI e escopo:** os workflows observados verificam build, hashes, pacote, regressão e dependências; não possuem etapa nova de deploy. Não foram criadas contas, instâncias, credenciais, webhooks ou recursos externos.

## 2. Matriz de PRs, dependências e evidência

| PR | Objetivo e base exata | Validação/CI registrada | Parecer |
| --- | --- | --- | --- |
| [#1](https://github.com/Exekuta-Site/exe-pro-cloud/pull/1) | Headers da resposta HTML do Portal; base `auditoria/4.4.0-importacao` | Build duplo estável, **13/13** testes locais e sintaxe aprovada; **sem CI próprio** para HEAD `787dd6b7...` | Código revisado; exige teste integrado de Portal e validação da base de importação antes de integração |
| [#2](https://github.com/Exekuta-Site/exe-pro-cloud/pull/2) | Prebuilt opt-in, manifesto original; base **PR #1** | [CI #45404780807](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45404780807) **success**, **19/19** na revisão local combinada | Recurso opcional; cobertura de integridade original insuficiente e **corrigida pelo PR #4**, que deve acompanhá-lo |
| [#3](https://github.com/Exekuta-Site/exe-pro-cloud/pull/3) | Auditoria/documentação de backups; base **PR #2**, ramificação paralela | [CI #45431392171](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45431392171) **success** no HEAD `799399be...`; diff **5 arquivos docs** | **Histórico preservado. Planejamento adicional encerrado; fora da cadeia de homologação prebuilt** |
| [#4](https://github.com/Exekuta-Site/exe-pro-cloud/pull/4) | Integridade v2 em `lib/`, `core/`, `integrations/`, `web/` e arquivos essenciais; base **PR #2** | [CI #45437077835](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45437077835) **success**; **35/35** testes locais combinados | Lacuna do PR #2 corrigida; ainda não constitui assinatura de release ou prova de `node_modules/` |
| [#5](https://github.com/Exekuta-Site/exe-pro-cloud/pull/5) | Empacotamento/transferência simulada + tar.gz; base **PR #4** | [CI #45441416672](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45441416672) **success**; **47/47** testes locais combinados; 93 + manifesto íntegros | Artefato de teste adequado para inspeção; não é pacote executável autossuficiente: exclui `node_modules/` e configuração |
| [#6](https://github.com/Exekuta-Site/exe-pro-cloud/pull/6) | Plano documental de homologação isolada; base **PR #5** | [CI #45627756083](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45627756083) **success** no HEAD, diff **um documento** | Portões e casos futuros preparados, testes de login/Portal ainda **não executados** |
| [#7](https://github.com/Exekuta-Site/exe-pro-cloud/pull/7) | Laboratório de instalação de dependências em runner descartável; base **PR #6** | [CI #45628888229](https://github.com/Exekuta-Site/exe-pro-cloud/actions/runs/45628888229) **success** no HEAD anterior a este relatório; `Disposable dependency laboratory` **success** | Instalação `pg` pelo lockfile validada no **runner CI**, não em produção; laboratório local sem npm DNS (`EAI_AGAIN`) |

**Atenção:** resultados **13/19/35/47** são conjuntos acumulados/sobrepostos, **não devem ser somados**. CI dos PRs #6 e #7 herda e reexecuta o código dos PRs anteriores; isso não transforma os testes unitários em homologação de produção.

## 3. Grafo de dependências e isolamento do PR #3

```text
main (SHA 839f478a...)
    |
    +-- auditoria/4.4.0-importacao  [2 commits à frente de main]
             |
             +-- PR #1  | Headers do Portal
                    |
                    +-- PR #2 | Prebuilt v1 opt-in
                           |
                           +-- PR #3 | Documentação de backups [RAMO HISTÓRICO, NÃO DEPENDÊNCIA]
                           |
                           +-- PR #4 | Integridade v2
                                  |
                                  +-- PR #5 | Pacote/verificação/transporte
                                         |
                                         +-- PR #6 | Plano de homologação
                                                |
                                                +-- PR #7 | Dependências isoladas
```

**Risco de integração estrutural real:** `auditoria/4.4.0-importacao` está **2 commits à frente da `main` e nenhum atrás**. O comparativo GitHub devolveu **300 arquivos** (limite da listagem disponível; não presumir inventário completo). O HEAD do PR #7 está **17 commits à frente da `main` e nenhum atrás**, incluindo importação inicial. **Não abrir merge direto dos PRs para `main` sem antes rever esses commits de base**, inventariar todo o diff e decidir estratégia de implantação separadamente.

O PR #3 é **paralelo** ao PR #4, não ancestor do PR #7; não colocá-lo como dependência operacional. O histórico pode permanecer em rascunho sem prosseguir a política de backups encerrada.

## 4. O que está validado versus o que ainda não foi validado

### Com evidência positiva
- Correção de headers via helper compatível com scripts inline; scripts/rotas do Portal não foram reescritos no PR #1.
- Build Node **22.x** concluído no CI (com configuração `actions/setup-node@v4` em 22).
- Manifesto SHA-256 schema 2 determinístico; rejeição de alteração, adição/exclusão de módulos/assets, arquivos faltantes e links simbólicos protegidos.
- Empacotamento com somente arquivos protegidos + manifesto, sem `.env`, dumps ou `node_modules/`; extração e verificação após transporte simulado.
- `package-lock.json` v3 fixa `pg 8.23.1`; CI instalou dependências via `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` em runner e revalidou manifesto/lockfile.
- Todos os sete PRs permanecem em rascunho e `main` inalterada após a consulta.

### Não comprovado / não autorizado nesta revisão
- Startup real ou carregamento de módulos `node_modules` pelo processo do servidor; integração de `initSchema`, autenticação, Portal, WhatsApp, CRM e outras APIs.
- Equivalência Node da Shard Cloud: relato anterior indicava **Node 26.12.1**, mas **não foi conferido no ambiente atual**. `engines.node >=22` não prova ausência de regressões entre versões.
- Isolamento efetivo de automações, filas, cron, webhooks, cobranças e qualquer comunicação com serviços reais.
- Testes de `/health`, `/ready`, login Admin/Portal, isolamento entre clientes, permissões, contratos, anexos e limite de upload, integrações com mocks e observabilidade.
- Pipeline de release/implantação real, atestação de origem, assinatura de artefato, verificação byte a byte das dependências de `node_modules`, monitoramento e rollback real.
- Estado/restaurabilidade do backup PostgreSQL: painel mostrava item disponível, **nenhum restore em ambiente isolado foi realizado**. Não exigir implantação de plano de backups extra como pré-requisito para **revisão estática**; eventual política de rollback de produção exige decisão futura apropriada.

**Alerta de código confirmado:** `server.js` chama `await initSchema(pool)`, `await bootstrapAdmin()` e `await applyRecoveryPassword()` **antes** de `server.listen`. O endpoint `/ready` executa `SELECT 1` em PostgreSQL; `/health` não atesta banco. **NUNCA iniciar** com `DATABASE_URL` ou outros parâmetros apontando a `exe-pro-db` em uma homologação.

## 5. Ordem recomendada para homologação (FUTURA, não executada)

**Etapa 0 — Revisão da base do repositório (sem merge).** Inventariar os 2 commits de importação e o comparativo `main` ↔ `auditoria/4.4.0-importacao` sem modificar nenhum ref. Confirmar se código de produção corresponde aos arquivos de referência importados. **Sem acesso ao servidor de produção nesta etapa**; se a equivalência não puder ser comprovada, registrar divergência.

**Etapa 1 — Gate estático do código e pacote (já coberto por CI).** Considerar o fluxo `PR #1 → #2 → #4 → #5 → #6 → #7`, mantendo #3 arquivado como histórico documental. Confirmar que cada PR segue em rascunho; CI, manifestos, tar.gz, hashes e testes de regressão disponíveis. Não tratar `success` do CI como liberação de produção.

**Etapa 2 — Projeto de isolamento e aprovação específica.** Antes de qualquer processo, documentar um **ambiente descartável SEM conexão a `exe-pro-db`**, rede externa bloqueada, domínio de teste, segredos fictícios, *fixtures* sintéticas, PostgreSQL **próprio e independente** e mock de todas as integrações e automações. Validar por análise que jobs e efeitos colaterais estejam desabilitados; se não, **bloquear startup**.

**Etapa 3 — Startup em ambiente realmente isolado (EXIGE OUTRA APROVAÇÃO).** Após comprovar Etapa 2, instalar dependências no ambiente de teste, confirmar Node/runtime, manifesto e executar `start:prebuilt` **somente com PostgreSQL sintético separado**. O startup pode alterar esquema e usuários nesse DB de laboratório. Nenhuma chamada ao PostgreSQL de produção.

**Etapa 4 — Testes funcionais em ambiente fictício (EXIGE OUTRA APROVAÇÃO).** Testar `/health`, `/ready`, login e logout Admin/Portal, separação entre contas, fluxos de CRM/propostas/contratos, documentos/anexos, headers HTTP, upload, PWA, integrações simuladas, falhas seguras e logs. Registrar casos aprovados/reprovados sem dados reais.

**Etapa 5 — Parecer sobre eventual integração/publicação (EXIGE DECISÃO NOVA).** Só após as Etapas 0–4, revisar compatibilidade Shard, segregação de instalação de dependências, distribuição segura do artefato, plano de recuperação/rollback e processo de aprovação. **Não realizar merge, deploy, troca de startup, criação de backup ou webhook automaticamente**.

## 6. Critérios de bloqueio

| Critério | Status atual | Efeito |
| --- | --- | --- |
| Todos os PRs em rascunho | **OK** | Preservar |
| CI no HEAD de PRs #2–#7 | **OK** | Evidência de build/teste; não substitui homologação |
| CI dedicado no HEAD PR #1 | **Não registrado** | Seus testes foram rodados localmente e em ramos descendentes |
| Comparação/análise completa dos 2 commits de importação antes da main | **PENDENTE** | Impede proposta séria de merge |
| Laboratório sintético com PostgreSQL separado e saída externa bloqueada | **NÃO CRIADO** | Impede startup real |
| Testes integrados Admin/Portal/CRM/recebíveis | **NÃO EXECUTADOS** | Impede liberação de release |
| Compatibilidade real da versão Node/Shard | **NÃO COMPROVADA** | Impede liberação de release |
| Plano de implantação e rollback específico | **NÃO APROVADO** | Impede deploy |
| Autorização do titular para merge/deploy/SQL/startup | **NÃO CONCEDIDA** | **BLOQUEIO ABSOLUTO** |

## 7. Ações nesta revisão e declaração de segurança

**Ação efetuada:** leitura do repositório privado, comparação de branches, consulta de PRs/CI e **acréscimo deste relatório documental no PR #7**, preservando seus workflows de código e as demais branches. O novo commit documental pode disparar CI automaticamente conforme o workflow existente; **o status dessa execução deve ser confirmado separadamente**.

**NÃO efetuado:** merge, mudança de `main`, deploy, webhook, startup do EXE PRO, conexão/consulta SQL ao PostgreSQL, operação de backup, criação de conta/serviço ou alteração dos dados de clientes.

**Decisão final:** `PASSA PARA PLANEJAMENTO DE HOMOLOGAÇÃO ISOLADA`; `NÃO PASSA PARA PRODUÇÃO`. Próxima tarefa recomendada: **inventariar a base `auditoria/4.4.0-importacao` versus `main` e preparar as condições de um laboratório de integração totalmente desconectado, sem executar serviços**.

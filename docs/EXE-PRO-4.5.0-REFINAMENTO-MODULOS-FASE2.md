# EXE PRO v4.5.0 — Fase 2 · Refinamento visual dos módulos e blocos

**Data:** 25/11/2026 · **Estado:** código em branch de design, PR #9 **Draft**, sem merge, deploy ou mudança de produção.

## Objetivo

Dar continuidade à direção visual premium aprovada na prévia do EXE PRO v4.5.0, **sem reconstruir o sistema** e mantendo todas as funções, dados, rotas, eventos de clique, modais, permissões e identidade EXEKUTA Dark/Neon.

## Alterações realizadas nesta fase

- **Central Comercial:** `commercial366-rulebar`, KPIs, cards, score, metadados, filtros e funil; alertas `.overdue` e `.today` continuam diferenciados por cores semânticas.
- **Prospecção / Lead Score:** abas, filtros, toolbar, cartões, endereço, métricas, score e área de ações; links, fotos, fontes e scores não foram editados.
- **Tarefas e equipe:** colunas de kanban, cartões, seções de SLA e comentários; estado `.sla-over` preserva destaque de atraso.
- **Financeiro, CRM e clientes:** checkboxes, indicadores, chips, barra de cliente, cards de leads e elementos associados; sem mudança nos cálculos.
- **Relatórios SEO:** seções, títulos e linhas da tabela de palavras-chave.
- **Grids de KPIs por módulo:** corrigida a precedência dos seletores da Fase 1, que eram genéricos para `.kpis`. Os grupos `t391-kpis`, `c390-kpis`, `b384-kpis`, `notif-kpis`, `wp370-kpis`, `seo382-kpis`, `d383-kpis`, `cp380-kpis` e `a381-kpis` agora recuperam o número apropriado de colunas em desktop e breakpoints mobile.
- **Indicadores de segurança visual:** `.btn.danger`, `.danger369`, `.status.bad`, `.status.warn`, `.status.ok`, `.commercial366-card.overdue` e `.t391-card.sla-over` seguem destacando corretamente estados que não devem parecer ações comuns.

## Arquitetura e arquivos

A Fase 1 permanece intacta em `web/exe-pro-visual-premium-450.css`. A Fase 2 acrescenta `web/exe-pro-visual-modules-450.css`, com seletores escopados por `#content`. O patch idempotente `tools/apply-premium-visual-450.js` lê os **dois arquivos** e injeta um **único bloco** `<style id="exeProVisualPremium450">...` ao final do `head` do Admin, depois de todos os patches antigos.

**Por que não editar diretamente `web/index.html`?** O build executa `tools/materialize.js`, recria o HTML e aplica patches. Uma modificação manual do HTML gerado desapareceria no build seguinte.

O arquivo `tests/visual-premium-450.test.js` passa de **8 para 12 testes**, acrescentando:
1. Verificação da ordem Fase 1 → Fase 2 dentro do único bloco;
2. Atualização de CSS dos módulos sem mexer no restante do HTML;
3. Falha segura se o arquivo CSS modular não existir;
4. Cobertura estática de seletores de KPIs, atrasos, SLA, ações perigosas, accent e mobile.

No CI, a suíte também confere que o HTML final construído contém esses seletores em apenas um bloco premium.

## Regras de segurança mantidas

- **Não foram modificados:** `server.js`, `web/index.html` versionado, `web/portal.html`, JavaScript dos módulos, handlers `onclick`, rotas, APIs, integrações, banco, conteúdo de clientes, modal, funções ou dados.
- **Não houve:** inicialização de servidor, conexão ao PostgreSQL, SQL, webhook, merge, deploy ou alteração de produção.
- A base continua a branch de trabalho do PR #7; a `main` não possui a importação da aplicação. Não aprovar integração em produção só porque um CI passou.
- `package.json` mantém a versão publicada **4.4.0**; `v4.5.0` é a iniciativa visual em desenvolvimento.

## Testes e aceite

- [ ] CI do **HEAD definitivo** do PR #9: build completo, 12 testes visuais, regressões prebuilt, Portal e WhatsApp — verificar resultado antes de marcar como aprovado.
- [ ] Validação de CSS e das regras semânticas em desktop e mobile.
- [ ] **Revisão real em navegador** de todos os módulos depois de homologação isolada: ainda não executada nesta etapa.
- [ ] Preservar PR #9 em Draft e solicitar aprovação específica separada para qualquer futura publicação.

**Próximo passo recomendado após testes:** atualizar a prévia estática de módulos com dados fictícios para avaliação visual comparativa, sem executar o aplicativo ou conectar ao banco.

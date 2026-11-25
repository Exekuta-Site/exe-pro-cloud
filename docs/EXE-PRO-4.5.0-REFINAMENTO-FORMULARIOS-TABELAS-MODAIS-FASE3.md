# EXE PRO v4.5.0 — Fase 3 · Formulários, tabelas, modais e interações

**Data:** 25/11/2026 · **Estado:** refinamento CSS incremental em branch de design e PR #9, sem publicação.  
**Base:** Fases 1 e 2 aprovadas visualmente pelo proprietário; este documento registra a terceira camada, **ainda sem aceite visual final**.

## Objetivo

Melhorar legibilidade, consistência e acessibilidade dos **componentes existentes**, respeitando EXEKUTA Dark/Neon, `var(--accent)` configurável, funcionalidades, handlers, rotas, dados e todos os modais.

## Código inspecionado antes do ajuste

- `web/index.html` real e versionado no PR #9 (mesmo blob da base). O conteúdo principal usa `#content`, com `.form-grid`, `.field`, `.input`, `.table-wrap`, `.table`, `.btn`, `.tab` e `.status`.
- Modal real: `<div id="modalBack" class="modal-back hidden">` com `.modal`, `.modal-head`, `#modalBody`, botão com `onclick="closeModal()"`. O modal está **fora de `#content`**, exigindo seletores próprios.
- Toast real: `#toast.toast.hidden`, também fora de `#content`. A classe `.hidden` não foi sobrescrita.
- O HTML é materializado por `tools/materialize.js` em cada build, por isso a Fase 3 é injetada após as duas camadas existentes, sem modificar manualmente esse HTML.

## Entrega de código — somente apresentação

| Componente | Modificação |
| --- | --- |
| Formulários | Campos e labels mais legíveis, espaçamento consistente, preenchimento e contraste escuro, foco com accent, `aria-invalid="true"`, `disabled`, `read-only` |
| Seletores e checkbox | Mantidos controles nativos; `accent-color: var(--accent)`, foco de teclado, exclusão explícita de checkbox/radio/file/color das regras especiais de read-only |
| Tabelas | Cabeçalho com contraste, linhas alternadas, hover apenas em dispositivo compatível, foco dentro da linha, scroll horizontal **dentro** do `.table-wrap` |
| Botões e tabs | Estados `:focus-visible`, `:active`, `:disabled`, `aria-disabled`, `aria-busy` e tab ativa; ações `.btn.danger` mantêm vermelho de alerta |
| Modal real | Overlay, contraste do painel, hierarquia do título, botão fechar, campos internos e área rolável com altura limitada por viewport |
| Toast e avisos | Acabamento escuro/neon sem modificar texto, durações, eventos, classes de visibilidade ou z-index |
| Mobile e acessibilidade | Layout de uma coluna para formulários, modal compacto com scroll interno, tabela rolável, `prefers-reduced-motion` |

**Arquivos desta fase:**
- Novo `web/exe-pro-visual-interactions-450.css` — CSS independente.
- Alteração mínima de `tools/apply-premium-visual-450.js`: junta CSS **base → módulos → interações** em **um único** `<style id="exeProVisualPremium450">`, sem scripts/JS adicionados ao HTML funcional.
- Expansão de `tests/visual-premium-450.test.js`: de 12 para **18 testes**; o workflow CI existente já executa a suíte e todos os testes regressivos.
- Este documento de evidência.

**Não houve alteração** de `package.json` nesta fase, `server.js`, `web/index.html` versionado, `web/portal.html`, `web/*.js`, arquivos de usuários, dados de clientes ou configurações de produção.

## Regressões a confirmar

- [ ] `npm run build` concluiu sem tocar em APIs/rotas; o helper continua idempotente.
- [ ] CI no HEAD atual confirma **18 testes visuais**, incluindo cópia exata do HTML funcional antes/depois de remover o bloco CSS.
- [ ] Ausência do CSS de interações e conteúdo inválido abortam sem escrita parcial.
- [ ] Um único bloco premium no fim do `head` com ordem estável: base → módulos → interações.
- [ ] Regressões de Portal, WhatsApp, leads, prebuilt, empacotamento e sintaxe continuam verdes.
- [ ] Revisão visual real dos diferentes estados de modal, tabela e campo em desktop/mobile — **pendente**, não substituir pela evidência do CI.

**Limite dos testes:** os casos são estáticos e de build; não foram executados login, cliente, Portal, interações reais ou serviços.

## Controles de segurança

- **Não iniciou** `node server.js`, `npm start` ou `start:prebuilt`.
- **Não acessou PostgreSQL**, não executou SQL nem migrações, não fez chamadas de webhook.
- **Não realizou merge, deploy ou qualquer alteração da `main` e produção**.
- PR #9 permanece como **Draft** dependente do PR #7; a versão publicada permanece `4.4.0` até autorização específica.
- O novo CSS não define `.hidden`, não altera `display:none` dos componentes e não incorpora scripts.
- Futura aprovação visual específica antes de publicação.

**Próximo passo recomendado:** prévia estática com campos, estados de validação, tabelas e modal com informações fictícias e teste responsivo em navegador, sem inicializar a aplicação.

# EXE PRO v4.5.0 — Modernização Visual Premium · Fase 1

**Data:** 25/11/2026 · **Status:** implementação incremental de visual em branch isolada, sem deploy.  
**Base do trabalho:** PR #7 (`test/prebuilt-disposable-dependency-lab-4.4.0`), HEAD de partida `e5dc24233ea627fb1a266c5e8a73e39d9964e118`.  
**Branch:** `design/exe-pro-4.5.0-premium-dashboard`, PR em rascunho.  
**Projeto:** EXE PRO (Node.js, HTML/CSS/JS), **não é WordPress**.

## 1. Objetivo

Melhorar a experiência visual **do código existente**: Dashboard, cards de métricas, blocos de módulos e elementos reutilizados, preservando dados, arquitetura, identidade EXEKUTA Dark/Neon, rotas, permissões, cliques, modais e integrações.

**Não é uma reescrita:** esta fase é **exclusivamente CSS** mais uma etapa de build idempotente. O versionamento do `package.json` continua `4.4.0`, pois `4.5.0` identifica a **iniciativa visual em revisão**, não uma versão publicada.

### Design system preservado

- Paleta escura, accent neon **dinâmico `var(--accent)`** (não congelar cor; Painel Mestre mantém personalização).
- Uso de cinzas/esverdeados sutis em superfícies para dar profundidade sem perder legibilidade.
- Bordas, sombras e raios mais consistentes, sem distorcer logos, ícones ou o conteúdo de clientes.
- Estados de foco `:focus-visible`, responsividade progressiva e respeito a `prefers-reduced-motion`.

## 2. Mudanças visuais efetivas

| Elemento existente | Ajuste proposto no CSS |
| --- | --- |
| Dashboard · `#content .section-head` | Cabeçalho com melhor hierarquia, espaçamento, contraste e halo neon discreto |
| Dashboard · `#content .kpis/.kpi` | Grid responsiva (5/4/3/2 colunas por largura), accent superior, números tabulares com melhor leitura, destaque sutil ao hover |
| Dashboard · `#content .cols2 .card` | Painéis de pipeline e atividades com bordas e ritmo visual harmonizados |
| Gráficos · `#content .chartbar/.bar` | Labels e barras mais legíveis, com realce neon mantido |
| Alertas · `#content .alert` | Hierarquia de prioridade e texto, sem alterar regras de classificação nem botões |
| Cards e blocos de módulos | Aparência consistente para `.card`, `.lead-card`, `.result-card`, `.commercial366-card`, `.prospect365-card`, `.master363-card` |
| Funil e tabelas | Colunas `.pipe-col`, blocos, cabeçalhos e linhas com contraste mais uniforme |
| Controles de formulários | `.input`, `select`, `textarea`, `.btn`, `.tab` com foco e interação visíveis, sem mudar handlers |
| Telas estreitas | Ajustes nos KPIs e blocos até 1350/1100/800/430 px; preferência de movimento reduzido respeitada |

**Nenhuma alteração no conteúdo exibido**, nomes de serviços, dados, totais, renderizadores de HTML, templates de proposta, regras de cálculo ou endpoints.

## 3. Arquitetura incremental do patch

O fluxo já existente executa `tools/materialize.js` e muitos `tools/apply-*`, reconstruindo `web/index.html` a cada `npm run build`. Editar somente o HTML gerado causaria perda de CSS no build seguinte.

Por isso, acrescentamos:

1. `web/exe-pro-visual-premium-450.css`: **CSS puro**, novo, estilizando seletores existentes (escopo predominante `#content`).
2. `tools/apply-premium-visual-450.js`: injeta o CSS como `<style id="exeProVisualPremium450"> ... </style>` **no fim do `head`** do Admin, depois de todos os estilos legados.
3. `package.json`: a chamada da injeção entra **após** `tools/apply-portal-security-headers.js` e **antes** de `tools/build-check.js`. Todos os outros scripts permanecem.
4. `tests/visual-premium-450.test.js`: verifica preservação do markup funcional, dos handlers inline, idempotência, atualizações de CSS, falha segura quando falta `head`, proteção contra duplicatas e composição no build CI.
5. `.github/workflows/ci.yml`: executa os testes CSS no runner, após compilar todo o projeto.

O patch não usa `innerHTML`, `addEventListener`, mutações DOM, rede, banco de dados nem variáveis sensíveis: apenas lê `web/index.html`, lê o CSS e reinsere o bloco de estilo marcado ao final do `head` no build.

## 4. Critérios de aceitação técnica

- [ ] CI da branch de design `success` **no HEAD definitivo**; registrar link da execução após verificação.
- [ ] `npm run build` original aprovado, incluindo `tools/build-check.js`.
- [ ] Suite `tests/visual-premium-450.test.js` aprovada.
- [ ] Continuam passando os testes prebuilt, Portal, WhatsApp, CRM e lead existentes no CI.
- [ ] Após dois builds consecutivos, verificar que existe exatamente **um** `exeProVisualPremium450` e que o patch não causa diferenças adicionais.
- [ ] Revisão **visual real** de Dashboard, módulos, mobile e botões em ambiente de homologação **ainda pendente**; não afirmar que telas em produção foram vistas.
- [ ] PR permanece Draft; nenhum merge, deploy ou alteração de `main`.

## 5. Limites e riscos

- Essa fase **não altera versões de rotas**, scripts de dados nem módulos do backend. A `main` atual não contém a aplicação importada; o PR é empilhado sobre PR #7, não autorizado para integração.
- Os CSS específicos dos módulos continuam existindo; nossa camada acrescenta apenas acabamento sobre seletores conhecidos. Uma revisão em navegador é necessária para verificar layout em uso real, contrastes e estados específicos.
- Não abrir o app, não realizar chamadas HTTP ou PostgreSQL, não instalar serviços, não configurar webhook, não fazer merge ou deploy. A UI em produção não muda até uma aprovação de publicação separada.
- Os PRs #1–#8 e o planejamento de backups permanecem preservados, sem alteração de status.
- Nenhuma logo foi recriada ou substituída.

## 6. Próxima etapa recomendada após CI

**Pré-visualização/QA visual** em ambiente de demonstração isolado e sem dados reais, com screenshots de Dashboard em desktop e mobile, estados de hover/foco e cards de clientes, projetos, tarefas e financeiro. Essa etapa exigirá aprovação operacional própria e não pode acessar PostgreSQL de produção.

**Critério de conclusão desta fase:** código visual e testes no PR em rascunho, documentação de estilos e relatório CI; **não liberar deploy**.

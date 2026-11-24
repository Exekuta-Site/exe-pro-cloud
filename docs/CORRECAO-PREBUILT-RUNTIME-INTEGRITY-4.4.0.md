# EXE PRO v4.4.0 — Correção cirúrgica da integridade do artefato prebuilt

**Data:** 24/11/2026. **Status:** branch de correção para revisão; **não publicado em produção**.  
**Branch:** `fix/prebuilt-runtime-integrity-4.4.0`, baseada no PR #2 `fix/prebuilt-startup-4.4.0`.  
**Escopo:** `tools/prebuilt-artifact.js` e testes `tests/prebuilt-artifact.test.js`; demais alterações somente documentais.  
**Regra:** NÃO realizar merge, deploy, webhook, startup real, SQL ou acesso ao PostgreSQL.

## 1. Problema reproduzido no PR #2

O manifesto anterior (schema 1) cobria cinco arquivos: `server.js`, `web/index.html`, `web/portal.html`, `web/service-worker.js` e `web/manifest.webmanifest`. Uma alteração em `lib/portal-response-headers.js` após a geração do manifesto não bloqueava `check:prebuilt`.

**Não bastava para atestar a integridade dos arquivos de runtime.** O recurso prebuilt é opcional e não estava ativado em produção.

## 2. Solução incremental (schema 2)

`tools/prebuilt-artifact.js` agora calcula SHA-256 e registra uma lista ordenada dos arquivos imutáveis do pacote:

- `server.js`, `package.json`, `package-lock.json` e `tools/prebuilt-artifact.js`;
- `lib/`: arquivos `.js`, `.cjs`, `.mjs`, `.json`, `.sql`, `.node`, `.wasm` (inclui migrations SQL);
- `core/`: as mesmas extensões (inclui módulos aninhados);
- `integrations/`: `.js`, `.cjs`, `.mjs`, `.json`, `.sql`, `.php`, `.py`;
- `web/`: **todos os arquivos**, incluindo JS, CSS, HTML, SVG, service worker, manifesto e ZIPs de download.

Em cópia local isolada após build, o manifesto de schema 2 continha **93 arquivos**: 5 de `lib/`, 28 de `core/`, 54 de `web/`, 2 de `integrations/` e os 4 arquivos de raiz/validação listados acima.

A verificação bloqueia quando há divergência de hash, versão do pacote, arquivo necessário faltando, inclusão ou exclusão de arquivos protegidos ou links simbólicos dentro da cobertura. O manifesto de schema 1 é rejeitado: **é necessário regenerar manifesto de schema 2 para o novo pacote**. O arquivo continua ignorado no Git.

O manifesto é determinístico: mesmos arquivos e mesmo conteúdo geram exatamente os mesmos bytes, inclusive em builds repetidos.

## 3. Preservação do funcionamento atual

- Nenhuma linha de `server.js`, `web/index.html` ou `web/portal.html` foi alterada por este PR.
- `npm run build`, `npm start`, `build:prebuilt`, `seal:prebuilt`, `check:prebuilt` e `start:prebuilt` mantêm as mesmas assinaturas e comandos do PR #2.
- Nenhuma rota, modal, clique, controle de acesso, integração de cliente ou tabela PostgreSQL foi editada.
- O pipeline build do EXE PRO continua podendo materializar os arquivos como antes; o manifesto deve ser gerado **após o build** e distribuído junto ao pacote pronto.
- Rotinas de build (`tools/apply-*`), `payload/` e documentação não são verificadas no startup prebuilt porque não fazem parte do código executado no **modo de inicialização já compilado**.
- Não incluir `.env`, secrets, logs, dados de usuários, diretórios temporários, `node_modules/` nem dumps de banco no manifesto. `package-lock.json` está incluído, mas **isso não comprova os bytes das dependências instaladas em `node_modules`**.

## 4. Testes reproduzidos sem executar servidor ou banco

**Node.js 22.16.0; cópia isolada; sem ambiente Shard Cloud.**

| Verificação | Resultado |
| --- | --- |
| `npm run build:prebuilt` | **2/2 sucesso** |
| `npm run check:prebuilt` após cada build | **2/2 sucesso** |
| SHA-256 de `server.js`, `web/index.html`, `web/portal.html`, `web/service-worker.js`, `web/manifest.webmanifest`, e do manifesto | **Idênticos entre os dois builds** |
| `node --test tests/prebuilt-artifact.test.js ...` com suites Portal/WhatsApp/lead | **35/35 aprovados** |
| Testes específicos de manifesto | **22/22 aprovados** |
| `node --check server.js` e syntax check do módulo | **Aprovado** |

Casos negativos cobertos: alteração de `server.js`, `lib/`, `core/`, migration SQL, PHP de integração, JS/CSS/SVG/ZIP em `web/`, `package-lock.json`, verificador, versão divergente, manifestos ausente/adulterado/antigo, arquivo faltando, novo módulo/asset e links simbólicos.

## 5. Limites e riscos remanescentes

1. O manifesto **não é assinatura digital** e não prova autenticidade de origem: alguém com acesso para alterar simultaneamente os artefatos, o manifesto e/ou o verificador pode contornar o controle. Para proveniência, usar assinatura/atestado de release em fase posterior.
2. `node_modules/` não é protegido byte a byte; o lockfile identifica dependências declaradas, mas é necessária instalação reprodutível e controle de supply chain na esteira de release.
3. Diretórios com dados mutáveis **não devem** ser colocados dentro de `web/`, `lib/`, `core/` ou `integrations/` durante execução prebuilt; alterações nesses diretórios invalidam a verificação como previsto.
4. Ainda faltam teste de inicialização real em homologação, rotas, login, portal, arquivos, integrações, `/ready`, ambiente Node real de Shard Cloud e teste de restore PostgreSQL isolado. **O backup foi listado na interface, mas a recuperação não está comprovada.**
5. Não ativar `start:prebuilt` no Shard Cloud sem um fluxo comprovado que entregue os artefatos e seu manifesto **como um mesmo pacote**, sem executar `npm run build` durante o boot.

## 6. Aprovações e bloqueios

**Permitido nesta etapa:** editar somente a nova branch, executar builds/testes de código local sem serviços, criar novo PR em rascunho dependente do PR #2.

**Expressamente não autorizado:** merge PR #1/#2/novo PR, publicação, webhook, startup com banco real, migração, edição da `main`, troca do comando de boot ou alterações de dados do EXE PRO.

O plano de backup adicional foi encerrado pelo titular; manter seus relatórios como histórico, sem reabrir formulários/rotinas.

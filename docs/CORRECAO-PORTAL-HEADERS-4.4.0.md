# EXE PRO 4.4.0 — Proteção dos cabeçalhos do Portal (branch de correção)

Escopo: **somente resposta HTML** do Portal do Cliente, preservando todos os caminhos, modais, endpoints, autenticação, WordPress e demais funções.

## Problema reproduzido pela auditoria

A rota GET de `web/portal.html` em `server.js` não aplicava `Content-Security-Policy`, `X-Frame-Options` e HSTS (quando configurado), diferentemente das respostas JSON e da página de Cloud Web.

## Correção cirúrgica

- Novo helper puro `lib/portal-response-headers.js`: mantém `content-type`, `content-length`, `cache-control`, `nosniff` e `referrer-policy`, adicionando `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`, e HSTS condicional (mesma condição `REQUIRE_HTTPS` já usada nas outras rotas).
- `server.js`: importa o helper e usa seus headers na rota GET que já atende `/portal`, `/portal/`, `/portal/index.html` e a raiz de `portal.exekuta.com.br`. Nenhuma rota adicionada ou removida.
- `tools/apply-portal-security-headers.js`: patch idempotente executado **após** todos os patches existentes e antes de `build-check`. Necessário porque `tools/materialize.js` reconstitui `server.js` a cada build. Se as âncoras mudarem, o script falha explicitamente em vez de alterar uma rota incorreta.
- `tests/portal-response-headers.test.js`: cobertura de proteção contra iframe, CSP compatível, HSTS condicional e associação à rota existente.
- Workflow de CI: inclui esses testes junto da suíte já existente; **nenhum job de deploy foi adicionado**.

O Portal contém scripts inline legados; deliberadamente **não** definimos `default-src`, `script-src` ou `style-src` na política nova, para não interromper o funcionamento atual. Essa CSP não pretende ser uma política anti-XSS completa, apenas aplica as restrições citadas. Uma CSP completa requer inventário e testes em homologação.

## Testes locais efetuados (sem acesso ao banco/produção)

- Node.js **22.16.0**.
- `npm run build`: sucesso.
- Segunda execução de `npm run build`: sucesso e **hashes SHA-256 idênticos** para `server.js`, `web/index.html`, `web/portal.html`.
- `node --test tests/portal-response-headers.test.js tools/whatsapp420/history.test.js tools/whatsapp420/cleanup.test.js tools/site440/lead.test.js`: **13/13 aprovados**.
- `node --check server.js`: sucesso.
- `web/index.html` e `web/portal.html` não sofreram alterações de conteúdo.

## Antes de qualquer implantação

1. Confirmar backup recuperável do PostgreSQL em ambiente isolado — ainda **não comprovado**.
2. Validar o build/rotas com Node usado realmente em produção e em ambiente de homologação antes de editar comandos do Shard Cloud.
3. Verificar HTTP response headers na rota do Portal e regressão de login, dashboard, documentos, anexos, WordPress e automações.
4. Não configurar webhook, não realizar merge para `main` e não fazer deploy sem aprovação expressa.

Este commit não altera banco de dados, migrações ou variáveis do ambiente.

# Checklist — EXE PRO 3.5.0 no Cloudways Velocity

## 1. Repositório
- [ ] Criar repositório Git privado.
- [ ] Colocar o conteúdo de `cloudways-app` na raiz do repositório.
- [ ] Confirmar `package.json`, `server.js`, `lib/`, `tools/` e `web/`.
- [ ] Não enviar `.env`, SQLite, chaves ou senhas ao Git.

## 2. Aplicação Velocity
- [ ] Criar aplicação Velocity conectada ao repositório.
- [ ] Node.js 22+.
- [ ] Package manager: npm.
- [ ] Build: `npm run build`.
- [ ] Start: `npm start`.

## 3. PostgreSQL
- [ ] Database → conectar PostgreSQL.
- [ ] Confirmar que as variáveis do banco foram adicionadas ao ambiente.
- [ ] Save & Redeploy.
- [ ] `/ready` deve responder `ready: true`.

## 4. Variáveis EXE PRO
- [ ] `EXE_CLOUD_KEY` — Sensitive.
- [ ] `EXE_CLOUD_SECRET_KEY` — Sensitive e diferente da chave de sync.
- [ ] `EXE_CLOUD_PUBLIC_URL=https://app.exekuta.com.br`.
- [ ] `EXE_CLOUD_REQUIRE_HTTPS=1`.
- [ ] `EXE_CLOUD_ADMIN_USER`.
- [ ] `EXE_CLOUD_ADMIN_PASSWORD` ou `EXE_CLOUD_ADMIN_PASSWORD_HASH` — Sensitive.

## 5. Primeiro acesso
- [ ] Abrir domínio temporário fornecido pelo Velocity.
- [ ] Testar `/health`.
- [ ] Testar `/ready`.
- [ ] Abrir `/app/` e entrar com usuário/senha.

## 6. Dados
- [ ] No Windows, fazer backup antes da primeira sincronização pública.
- [ ] Configurar URL Cloud para o domínio temporário ou final HTTPS.
- [ ] Configurar a mesma chave de sincronização.
- [ ] Testar conexão.
- [ ] Sincronizar.
- [ ] Conferir Leads, Projetos, Propostas, Financeiro e Serviços no Cloud Web.
- [ ] Pendentes = 0 e Conflitos = 0.

## 7. Domínio
- [ ] Adicionar `app.exekuta.com.br` no Domain Management.
- [ ] Adicionar no DNS somente os registros fornecidos pela Cloudways.
- [ ] Se o DNS já estiver no Cloudflare, seguir a orientação de DNS Only para os registros informados pelo Velocity.
- [ ] Aguardar verificação e testar HTTPS.

## 8. Produção
- [ ] Backup do Cloudways habilitado.
- [ ] Monitoring sem erros contínuos de CPU/RAM.
- [ ] Google Places/Serper configurados na área Cloud somente após o go-live.
- [ ] Nunca compartilhar `EXE_CLOUD_KEY`, `EXE_CLOUD_SECRET_KEY` ou senha do PostgreSQL.

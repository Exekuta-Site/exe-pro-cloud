# EXE PRO v4.4.0 — Plano técnico de homologação isolada do prebuilt

**Elaborado em:** 25/11/2026. **Estado: PLANO DOCUMENTAL, NÃO EXECUTADO.**

**Origem validada:** PR #5 (`fix/prebuilt-package-validation-4.4.0`), dependente dos PRs #4 → #2 → #1.  
**Branch desta documentação:** `docs/prebuilt-homologation-plan-4.4.0`, baseada na branch do PR #5.  
**Ambiente de produção:** Shard Cloud `exe-pro-cloud` e PostgreSQL `exe-pro-db`. **Fora de escopo e intocável.**

## 1. Decisão e limites desta etapa

**Objetivo:** descrever como seria homologado futuramente um artefato prebuilt sem build no startup, sem risco para dados e serviços existentes. **Não autoriza executar os passos.**

**Permitido agora:** leitura estática do código e da documentação no repositório privado; criação deste documento e PR de rascunho.

**Proibido agora:** iniciar servidor, executar `npm start` ou `start:prebuilt`, conectar/acessar qualquer PostgreSQL, executar migrações, instalar dependências, criar conta/instância, configurar secrets, disparar webhooks, integrar serviços, gerar/restaurar backups, fazer merge, deploy, mudar comandos do Shard Cloud ou tocar a branch `main`.

**Importante:** o app não é WordPress. Não reconstruir arquitetura, não mexer em Admin/Portal, rotas, modais, eventos ou dados de clientes. O planejamento adicional de backups foi encerrado pelo titular; **não reabrir esse planejamento** nesta revisão.

## 2. Fatos verificados no código atual do PR #5

| Item | Evidência de código | Implicação para homologação |
| --- | --- | --- |
| Linguagem/runtime | `package.json`: `engines.node >=22.0.0`; CI usa `actions/setup-node` com Node 22 | Fixar inicialmente **Node.js 22.x** em ambiente descartável; verificar também a versão realmente contratada em Shard antes de futura equivalência (relatório anterior indicava 26.12.1, não reconfirmado) |
| Dependências | `package.json` lista `pg:^8.13.0`; `package-lock.json` v3 fixa `pg 8.23.1` | Futuro `npm ci --omit=dev --ignore-scripts` **somente em pasta isolada após aprovação**, com cache/registry controlado; não é executado agora |
| Pacote | PR #5 confirmou **93 arquivos protegidos e 1 manifesto** em tar.gz verificado; inclui `package.json`, lockfile, `tools/prebuilt-artifact.js`, `server.js`, `lib/`, `core/`, `integrations/` e `web/` | Conferir hash do arquivo de transporte, inventário e manifesto antes de liberar qualquer teste funcional |
| Itens excluídos | O pacote **não inclui** `node_modules/`, `.env`, dados, dumps, ferramentas de build e `tools/bundle-prebuilt.js` | `check:bundle` é ferramenta **da árvore de origem/CI**, não comando a executar de dentro do pacote; no pacote usar somente `node tools/prebuilt-artifact.js verify` |
| Comando atual em produção | Relatório operacional informa `npm run build && npm start`; `npm start` continua `node server.js` | **Não alterar** no Shard Cloud; o prebuilt é opt-in e não foi ativado |
| Gate prebuilt | `npm run start:prebuilt` verifica manifesto e **depois inicia o servidor** | **Proibido nesta fase**; só considerar em futuro ambiente isolado explicitamente autorizado |
| Variáveis fundamentais | `server.js` exige `EXE_CLOUD_KEY` e usa `EXE_CLOUD_SECRET_KEY` (ou fallback), `PORT`/`EXE_CLOUD_PORT`, `EXE_CLOUD_HOST`, `EXE_CLOUD_PUBLIC_URL` e flags de HTTPS | Em homologação futura, usar **valores sintéticos** gerados para o ambiente e **nenhum segredo da produção** |
| Conexão PostgreSQL | `lib/postgres.js` usa `pg.Pool` e variáveis `DATABASE_URL`/alternativas; `server.js` cria pool e, no `start()`, executa `initSchema(pool)`, `bootstrapAdmin()` e `applyRecoveryPassword()` **antes** de `server.listen` | **Nunca iniciar com configuração apontando para produção.** A inicialização tem operações de schema/usuários e exige banco descartável com autorização futura |
| Saúde | `/health` retorna status da aplicação sem verificar conexão DB; `/ready` executa `SELECT 1` no PostgreSQL | Não interpretar `/health` como comprovação de recuperação do banco; somente testar `/ready` em ambiente futuro isolado |
| CI atual | Workflow PR do GitHub realiza `npm install`, build, seal, bundle, tar/extração, regressões e syntax check, **sem executar o servidor** | A revisão de CI existente não substitui testes integrados em ambiente de homologação |

## 3. Topologia de homologação proposta (NÃO criada)

```text
             FONTE PRIVADA / PR #5 (somente leitura)
                         |
           pacote .tar.gz + SHA-256 conhecido
                         |
               EXTRAÇÃO EM PASTA ISOLADA
                         |
               verificação do manifesto
                         |
        instalação de node_modules SOMENTE NO
            AMBIENTE DESCARTÁVEL AUTORIZADO
                         |
               GATE DE SEGURANÇA
           - rede sem saída para produção
           - secrets novos, sem dados reais
           - banco PostgreSQL de teste distinto
           - webhooks, tarefas agendadas e
             mensagens/cobranças desabilitados
                         |
                INICIALIZAÇÃO FUTURA
                  (NÃO NESTA ETAPA)
                         |
                testes funcionais com
                 dados 100% fictícios
```

**Isolamento obrigatório antes de qualquer execução:** host/container descartável, diretório independente, namespace de rede sem acesso a `exe-pro-db` ou serviços externos de clientes, secrets de teste guardados fora do Git, DB temporário **com nome/host/credenciais completamente distintos**, sem importação de dados reais. Caso não seja possível provar isolamento, **cancelar a homologação**, sem tentativa de startup.

## 4. Sequência recomendada para próxima etapa autorizada

### Portão A — inspeção e integridade (sem servidor e sem banco)
- [ ] Confirmar commit exato, branch e hash SHA-256 do tar.gz recebido; não usar pacote de origem desconhecida.
- [ ] Confirmar que o arquivo contém somente os 93 arquivos protegidos + manifesto (a contagem pode mudar em versões futuras: comparar com inventário real).
- [ ] Validar assinatura/proveniência da fonte quando existir; hashes relativos ao manifesto **não** demonstram autenticidade contra substituição conjunta.
- [ ] Extrair em diretório descartável e executar **somente após autorização específica da fase operacional** o verificador `node tools/prebuilt-artifact.js verify`. O script não executa servidor.
- [ ] Confirmar ausência de `.env`, secrets, dumps, banco, `node_modules/` e arquivos temporários.
- [ ] **Não** executar `npm run build` sobre o pacote recebido: o empacotamento deliberadamente não inclui ferramentas do build.
- [ ] Verificar que a cópia não contém arquivos extras ou links simbólicos nem divergências de hash.

### Portão B — runtime e dependências (para autorização futura)
- [ ] Fixar versão Node 22.x conhecida em teste; obter resultado de `node --version` e `npm --version` sem consultar produção.
- [ ] Revisar lockfile e árvore de dependências; reservar ambiente sem secrets ou dados, com registro de origem/versões.
- [ ] Após **nova autorização**, instalar dependências pelo lockfile no diretório de teste (**exemplo futuro**: `npm ci --omit=dev --ignore-scripts`). O `npm ci` pode acessar registry npm e instalar `node_modules` — **não foi executado nesta etapa**.
- [ ] Executar a verificação do manifesto no pacote **antes** da instalação; após `npm ci`, o verificador de manifesto `check:prebuilt` continua aplicável, porém `check:bundle` pode rejeitar arquivos extras como `node_modules` por design. **Não confundir os dois verificadores**.
- [ ] Não instalar ou usar bibliotecas e scripts desconhecidos fora do lockfile. Verificar compatibilidade Node 22 versus runtime Shard real antes de avançar.

### Portão C — configuração e dados totalmente sintéticos (para autorização futura)
- [ ] Revisar código de `initSchema`, `bootstrapAdmin` e `applyRecoveryPassword` como potencialmente mutável para o DB.
- [ ] Criar **somente após autorização própria** PostgreSQL de testes separado, vazio, com rede/usuário/credenciais independentes; nenhum snapshot, restore ou conexão de produção.
- [ ] Configurar `EXE_CLOUD_KEY`, `EXE_CLOUD_SECRET_KEY`, `EXE_CLOUD_PUBLIC_URL`, `PORT` e parâmetros de DB com **valores de laboratório**. Nunca copiar `DATABASE_URL`, dados de acesso, senhas e tokens de produção.
- [ ] Desativar efetivamente jobs, automações, notificações, anúncios, integração WhatsApp, cobrança, sincronizações e webhooks. **Validar essa desativação antes** da primeira execução, não presumir por falta de dados.
- [ ] Configurar bind apenas loopback ou rede privada isolada, sem DNS público ou tráfego externo.
- [ ] Se qualquer string de conexão referenciar `exe-pro-db` ou rede produtiva, **interromper**.

## 5. Checklist de testes funcionais — PLANEJADOS, NÃO REALIZADOS

| Grupo | Caso de teste futuro, com dados fictícios | Critério de aprovação |
| --- | --- | --- |
| Inicialização | `start:prebuilt` no destino isolado com manifesto válido e DB de teste | Sobe **somente** após verificação íntegra; sem build no boot |
| Falha segura | Manifesto ausente/adulterado, módulo ausente, versão diferente | Recusa iniciar; nenhuma tentativa de acessar DB |
| Saúde | GET `/health` e GET `/ready` | `/health` responde app; `/ready` só fica pronto quando o **DB de teste** responde |
| Administração | Login de administrador fictício, logout, sessão e bloqueio de credenciais inválidas | Fluxos válidos funcionam; acessos inválidos negados |
| Portal | Login de cliente fictício, isolamento de acesso entre dois clientes, logout | Sem vazamento entre clientes e sem acesso anônimo |
| Segurança HTTP | Headers da rota `/portal`: X-Frame-Options, CSP, HSTS condicional; cookies e CSRF | Headers esperados presentes, portal continua operacional |
| CRM | Criar/editar/listar lead fictício, funil, tarefas e propostas | Dados coerentes **apenas** no banco de testes |
| Documentos | Criar e visualizar documento/anexo sintético; upload válido e acima do limite | Fluxos preservados, limites e erros corretos, sem dados reais |
| Financeiro | Contratos/recebíveis com valores de teste | Cálculos e permissões corretos, **sem cobranças reais** |
| Automação/integrações | Exercitar fluxos com mocks/stubs desconectados | Nenhuma mensagem, webhook, ADS, WordPress ou transação externa |
| Assets | Admin, Portal, PWA/service worker, CSS/JS e recursos de download | Recursos existem, rotas respondem sem 404 inesperado |
| Shutdown | Parada limpa e eventual reinício em destino isolado | Sem erros persistentes ou perda indevida de dados de teste |
| Observabilidade | Logs redigidos e resposta a falhas | Não registrar segredos, tokens, dados fictícios identificáveis ou URLs produtivas |

**Nenhuma linha desta tabela está marcada como aprovada:** esses cenários só poderão ser executados em uma etapa futura, com autorização separada, isolamento e dados fictícios.

## 6. Riscos e condições de bloqueio

1. **Risco alto — banco mutável ao iniciar:** `start()` executa `initSchema(pool)` antes da abertura da porta; rodar contra `exe-pro-db` violaria o escopo de segurança. É condição de bloqueio absoluta.
2. **Risco médio — dependências externas:** lockfile `pg` está incluído, mas `node_modules/` não acompanha o tar; não há garantia de funcionamento até instalar e verificar em ambiente autorizado.
3. **Risco médio — autenticação:** cabeçalhos de segurança do PR #1 foram testados em unidade, **não** em login real do portal.
4. **Risco médio — integrações:** o servidor pode disparar tarefas/agendamentos; usar bloqueio de rede + mocks, não simplesmente presumir que a ausência de credenciais impede envio.
5. **Risco médio — cadeia de fornecimento:** SHA-256 relativo ao manifesto local não é atestação ou assinatura digital do pacote.
6. **Risco de versão:** CI Node 22 e relatório Shard Node 26.12.1 não equivalem a homologação do runtime produtivo.
7. **Risco de implantação:** PRs #1–#5 dependem uns dos outros; PRs abertos em rascunho **não** significam código na `main` ou no Shard Cloud.

## 7. Critério de conclusão e entregas futuras

**Esta etapa termina com:** plano no GitHub, PR exclusivamente documental em rascunho, cadeia de dependências preservada e `main` inalterada. **Não foram executados servidores, instalações, SQL, migrações, webhooks, backups ou deploys.**

**Etapa seguinte sugerida:** revisão do plano e dos limites de um ambiente completamente desconectado, com eventual aprovação **específica** de criação de fixture sintética e instalação de dependências; não iniciar automaticamente testes funcionais. A validação real de startup só virá depois de comprovar isolamento do PostgreSQL.

**Fontes internas:** `package.json`, `package-lock.json`, `server.js`, `lib/postgres.js`, `tools/prebuilt-artifact.js`, `tools/bundle-prebuilt.js`, `tools/healthcheck.js`, `.github/workflows/ci.yml` e `docs/VALIDACAO-PACOTE-PREBUILT-4.4.0.md` da branch base.

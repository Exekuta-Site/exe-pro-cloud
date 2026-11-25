# EXE PRO v4.4.0 — Laboratório descartável para validar dependências do prebuilt

**Registro:** 25/11/2026 · **Status:** pacote validado no laboratório local; instalação local bloqueada pela rede do ambiente; CI com laboratório descartável preparado para execução e verificação.  
**Branch exclusiva:** `test/prebuilt-disposable-dependency-lab-4.4.0` baseada em `docs/prebuilt-homologation-plan-4.4.0` (PR #6).  
**Escopo da autorização:** laboratório isolado, instalar dependências com scripts de instalação desativados, conferir lockfile e hashes, **sem iniciar servidor nem conectar PostgreSQL**.

## 1. Preparação e evidências do laboratório local

Artefato de referência, já validado no PR #5:

| Evidência | Resultado |
| --- | --- |
| Nome do arquivo | `exe-pro-prebuilt-v4.4.0-validated.tar.gz` |
| SHA-256 do arquivo | `66cbe779edbcd40c782fde03bfdf1a7903035876ca16753d0747e0c72667fc80` |
| Integridade do arquivo | Hash idêntico ao documentado na validação do PR #5 |
| Estrutura compactada | 113 entradas TAR: 94 arquivos e 19 diretórios |
| Arquivos regulares extraídos | **93 protegidos + manifesto SHA-256 schema 2 = 94** |
| Entradas inseguras | Sem caminhos absolutos, `..`, links simbólicos, dispositivos ou outros tipos especiais |
| Node.js local | **22.16.0** |
| npm local | **10.9.2** |
| Verificação após extração | `node tools/prebuilt-artifact.js verify`: **aprovada** |
| `node --check server.js` e verificador | **Aprovados** |
| Inventário após extração | Igual aos 94 arquivos esperados, **sem extras** |
| `.env`, banco SQLite ou `node_modules/` incluídos no TAR | **Não** |

Procedimento adotado: criação de **pasta temporária independente em `/mnt/data`**, inspeção de cada entrada do TAR antes da extração, extração somente de arquivos/diretórios seguros, validação do manifesto e comparação entre inventário extraído e manifesto. **Nenhum servidor, socket de aplicação ou conexão de banco foi aberto**.

### Tentativa de instalar dependências localmente

O laboratório tentou instalar as dependências **somente a partir do `package-lock.json`**, com ambiente de processo limpo, `HOME` e cache exclusivos, sem credenciais e com scripts de dependências desativados.

Comando funcional pretendido (executar **apenas dentro de laboratório**):

```bash
npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefer-offline
```

**Resultado local: não concluído.** A instalação falhou porque o container não conseguiu resolver `registry.npmjs.org` (erro npm **EAI_AGAIN**) ao tentar obter a distribuição do pacote `xtend@4.0.2`. Não há cache npm local suficiente. **Não relatar como dependências instaladas localmente.** Não foi feita tentativa de conexão com `exe-pro-db`.

O primeiro comando de preparação configurou incorretamente o mesmo arquivo de configuração npm como usuário e global (`/dev/null`), produzindo erro de duplicação de configuração; o ajuste para arquivos vazios distintos eliminou esse erro de laboratório. O impedimento restante é **somente a resolução DNS do registry**, não um teste de compatibilidade de código.

## 2. Identificação estática das dependências pelo lockfile

- `package.json`: Node `>=22.0.0`; dependência declarada `pg:^8.13.0`.
- `package-lock.json`: formato lock v3; resolved `pg 8.23.1` com `integrity` registrado e dependências transitivas. `node_modules/` não integra o arquivo compactado.
- A presença do lockfile garante **versões declaradas**, não comprova por si só que o conteúdo de `node_modules` tenha sido instalado ou carregado em runtime.

## 3. Laboratório alternativo em runner temporário do GitHub Actions

Para obter **evidência real de instalação**, sem depender do DNS indisponível no container local, foi incluída uma etapa de CI no workflow já existente. Não há mudança em `server.js`, scripts de startup, UI, rotas ou banco.

A etapa `Disposable dependency laboratory (no server or database)` faz o seguinte, **somente no runner temporário GitHub**:

1. Usa o artefato **que o próprio CI construiu, selou, compactou, extraiu e verificou**, sem downloads de backups ou dados de cliente.
2. Copia o pacote previamente extraído para `$RUNNER_TEMP/exe-pro-lab-dependencies`.
3. Cria `HOME` e cache npm exclusivos e arquivos `.npmrc` vazios e distintos.
4. Antes da instalação, verifica o manifesto, confirma que `.env` e `node_modules/` não estão no pacote, e mede SHA-256 do lockfile.
5. Executa `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` com `env -i`, herdando **apenas `PATH` e as configurações isoladas do npm**; sem passar variáveis de banco, tokens, chaves ou segredos do Shard.
6. Confere que SHA-256 do `package-lock.json` permanece idêntico.
7. Verifica novamente o manifesto, executa `npm ls --omit=dev --depth=0`, confere a versão `pg` instalada com a versão congelada no lockfile e verifica a sintaxe do `server.js`.
8. Encerra sem chamar `npm start`, `start:prebuilt`, `node server.js`, `/health`, `/ready`, SQL ou qualquer endpoint.

**Nota de interpretação:** `check:bundle` exige que **nenhum arquivo extra exista** e, por isso, é feito **antes** da instalação; após adicionar `node_modules/`, o teste pertinente é `node tools/prebuilt-artifact.js verify`. Isso não enfraquece a verificação dos 93 artefatos registrados no manifesto.

**Conclusão de CI:** registrar posteriormente, somente após verificar o status real da execução no GitHub. Não tratar a ausência de erros aparentes como prova de teste concluído.

## 4. Riscos residuais e critérios de aprovação

| Item | Condição para aprovar esta etapa |
| --- | --- |
| Pacote e manifesto | Hash correto, extração segura, inventário de 94 arquivos íntegro |
| Instalação local | **Bloqueada** por DNS; não é falha de código nem sucesso de instalação |
| Instalação alternativa CI | Aprovar apenas com CI concluído e **passo de dependências verde** |
| Dependências npm | Nenhum script de ciclo de vida executado; versões compatíveis com lockfile |
| Integridade pós-install | Manifesto intacto; hash do lockfile inalterado |
| PostgreSQL e servidor | **Nunca iniciados ou acessados** nesta etapa |
| Deploy / merge / Shard | **Não autorizado** |
| Testes de login/Portal/CRM | **Não executados**; dependem de ambiente de homologação isolado e autorização futura |

### Próxima aprovação (futura e separada)

Avaliar uma **simulação puramente estática de configuração de homologação**, usando apenas valores sintéticos e sem criar serviços. Não executar aplicação/DB ou instalar infraestrutura como consequência automática desta etapa.

**Limites:** nenhuma publicação, merge, webhook, mudança no comando de inicialização, aquisição de recursos ou operação de PostgreSQL/produção. Preservar todos os PRs como rascunho e o planejamento adicional de backups encerrado.

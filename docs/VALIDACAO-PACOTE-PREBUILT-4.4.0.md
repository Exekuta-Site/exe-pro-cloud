# EXE PRO v4.4.0 — Validação do pacote prebuilt isolado

**Data:** 24/11/2026. **Estado:** validado localmente, sem execução da aplicação.  
**Origem:** PR #4 (`fix/prebuilt-runtime-integrity-4.4.0`), manifesto v2, 93 arquivos monitorados.  
**Escopo:** branch específica `fix/prebuilt-package-validation-4.4.0`, PR em rascunho baseado no PR #4. Nenhum deploy, merge, webhook, conexão ao PostgreSQL ou mudança na produção.

## Objetivo e alteração incremental

Transportar um pacote gerado por `npm run build:prebuilt`, com os arquivos e o manifesto da **mesma versão**. A ferramenta opt-in `tools/bundle-prebuilt.js`:

1. **Valida os hashes de origem** antes de copiar qualquer arquivo.
2. Copia **somente os 93 arquivos listados no manifesto** e o próprio `.exe-pro-build-manifest.json` para `.prebuilt-dist/exe-pro-prebuilt-4.4.0/`.
3. **Valida novamente** o manifesto e exige que a lista de arquivos do destino seja idêntica à lista protegida (sem extras).
4. Rejeita manifesto ausente, hash divergente, arquivo faltante ou extra, link simbólico, sobrescrita de pacote existente e destino dentro das pastas protegidas de runtime.
5. Permite gerar um arquivo `.tar.gz` com ferramentas locais e testá-lo depois da extração em pasta separada. Não executa `node server.js` nem comandos de banco.

### Scripts acrescentados, sem substituir scripts existentes

```bash
npm run build:prebuilt       # existente: build e manifesto
npm run package:prebuilt     # novo: copia somente arquivos protegidos + manifesto
npm run check:bundle        # novo: verifica pacote e ausencia de extras
```

O projeto mantém `npm run build`, `npm start`, `start:prebuilt` e todo código de servidor, rotas, autenticação, Portal e banco exatamente como antes. O diretório `.prebuilt-dist/` é ignorado pelo Git.

## Conteúdo comprovado e exclusões

**93 arquivos imutáveis + 1 manifesto = 94 arquivos**. Inclui `server.js`, módulos `lib/`, `core/`, integrações, assets `web/`, downloads públicos, `package.json`, `package-lock.json` e `tools/prebuilt-artifact.js`.

**Excluídos por design:** `.env`, `.env.example`, dumps/SQLite, logs, `payload/`, scripts mutáveis de build `tools/apply-*`, `.git/` e `node_modules/`.

**Limite operacional:** `node_modules/` e configurações privadas precisam ser fornecidos por um pipeline de release/homologação separado. **Este pacote não foi testado como aplicativo em execução**. O hash do lockfile não verifica os bytes das dependências instaladas.

## Testes efetivamente executados em cópia isolada

Node.js **22.16.0**. Nenhuma porta/servidor foi aberto, nenhum serviço externo foi consultado.

| Verificação | Resultado |
| --- | --- |
| `npm run build:prebuilt`, duas execuções | **2/2 aprovadas** |
| `npm run check:prebuilt` após cada build | **2/2 aprovadas** |
| SHA-256 dos artefatos principais e manifesto após os dois builds | **Idênticos** |
| `npm run package:prebuilt` e `npm run check:bundle` | **Aprovados** |
| Testes unitários de pacote/transferência | **12/12 aprovados** |
| Suíte combinada prebuilt, pacote, Portal, WhatsApp e leads | **47/47 aprovados** |
| Transporte por cópia para outra pasta e verificação na pasta receptora | **Aprovado** |
| Tar.gz criado duas vezes com parâmetros determinísticos | **Bytes e SHA-256 idênticos** |
| Tar.gz extraído para diretório independente | **94 arquivos e manifesto íntegros** |
| `node --check server.js` e módulo de empacotamento | **Aprovados** |

**SHA-256 do tar.gz testado:** `66cbe779edbcd40c782fde03bfdf1a7903035876ca16753d0747e0c72667fc80`. Gerado localmente; **não foi enviado ao Shard Cloud nem publicado como release**.

Testes negativos exercitam: adulteração da origem, ausência do manifesto, alterações/exclusões no destino, arquivos extras, links simbólicos, destino já existente e destino em pasta protegida.

## CI no GitHub (sem deploy)

O workflow PR existente recebe etapas que, **somente no runner Ubuntu temporário**:

- selam o build e verificam hashes;
- geram e validam o pacote;
- criam tar.gz de forma determinística;
- extraem em `$RUNNER_TEMP/exe-pro-transferred`;
- verificam o pacote extraído com `tools/bundle-prebuilt.js verify` e, de dentro dele, `tools/prebuilt-artifact.js verify`;
- executam as suítes existentes e 12 testes novos.

O resultado do workflow deve ser consultado separadamente no próprio PR. **Não há ação de publicação nem acesso ao banco.**

## Riscos residuais / autorização

- O manifesto SHA-256 protege **integridade relativa ao próprio manifesto**, mas não prova autenticidade da origem nem impede substituição conjunta de pacote e manifesto.
- Não são atestados `node_modules/`, configuração de rede/infraestrutura, variáveis de ambiente, banco, disponibilidade, login, `/ready`, integrações nem comportamento de execução.
- A instalação de dependências e os testes integrados deverão ocorrer **em homologação isolada e apenas após nova aprovação**, sem acessar o PostgreSQL de produção.
- **Não alterar `npm start` ou o comando de startup do Shard Cloud; não fazer merge/deploy dos PRs sem autorização separada.**

**Conclusão:** empacotamento, transporte simulado e integridade do arquivo **validados em ambiente isolado**. Não configura liberação de produção.

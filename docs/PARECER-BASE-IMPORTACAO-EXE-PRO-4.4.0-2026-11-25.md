# EXE PRO v4.4.0 — Parecer sobre a base de importação versus `main`

**Data da auditoria:** 25/11/2026. **Escopo:** somente leitura dos commits, árvores Git, arquivos de configuração e documentação de origem; registro deste parecer e do inventário em **branch documental separada**.  
**Repositório:** `Exekuta-Site/exe-pro-cloud` — visibilidade **Private** confirmada no GitHub.  
**Conclusão:** **integridade estrutural do diff confirmada; integração na `main` NÃO APROVADA**. Esta auditoria **não é homologação funcional** e não garante equivalência com código de produção.

## 1. Commits auditados e confirmação de ancestralidade

| Ordem | SHA completo | Mensagem do commit | Efeito confirmado |
| --- | --- | --- | --- |
| Base | `839f478a0a5612412ff355f5cadf987ddcc90fa8` | `main` vigente | Dois blobs: `README.md` e `.gitignore` |
| 1 | `845837e99df67d399c915e7824e6c6d0a837207a` | `chore: import EXE PRO v4.4.0 reviewed source snapshot (no deploy)` | **299 arquivos adicionados**, **30.097 linhas adicionadas** nos metadados GitHub |
| 2 | `2fdde5bec7baaab36c5147f686ff8025c8304495` | `docs: record verified EXE PRO 4.4.0 build and audit findings (no production change)` | **1 arquivo de documentação** `docs/AUDITORIA-FASE2-EXE-PRO-4.4.0.md`, **50 linhas adicionadas** |

**Ancestralidade verificada:** primeiro commit tem `main` como único pai; segundo tem o primeiro como único pai. A comparação GitHub `main` → `auditoria/4.4.0-importacao` registrou `ahead=2`, `behind=0`. Não houve rebase, merge ou atualização dos dois refs durante esta revisão.

## 2. Inventário completo e preservação de arquivos existentes

Foram comparadas as árvores Git recursivas dos dois SHAs; ambas responderam `truncated=false`.

| Métrica | `main` | Branch `auditoria/4.4.0-importacao` | Variação |
| --- | ---: | ---: | ---: |
| Arquivos (blobs Git) | **2** | **302** | **+300** |
| Árvores de diretório | 0 | 61 | +61 |
| Arquivos adicionados | — | — | **300** |
| Arquivos existentes modificados | — | — | **0** |
| Arquivos excluídos | — | — | **0** |
| Soma dos bytes adicionados | — | — | **2.390.053 bytes** |

**Os dois arquivos originais, `README.md` e `.gitignore`, preservam os mesmos Git blob SHAs da `main`.** O inventário integral (caminhos, bytes e hashes Git de cada um dos 300 arquivos novos) está em [Inventário completo da base](./INVENTARIO-COMPLETO-BASE-IMPORTACAO-EXE-PRO-4.4.0-2026-11-25.md).

### Distribuição por diretório de primeiro nível

| Local | Arquivos adicionados | Observação |
| --- | ---: | --- |
| Raiz | 29 | `server.js`, `package.json`, `package-lock.json`, notas de release e arquivos de instruções |
| `.github` | 2 | Workflows de CI/build |
| `core` | 38 | Módulos e documentação de automação |
| `docs` | 7 | Evidências e relatórios históricos |
| `integrations` | 4 | Código de integração, incluindo WordPress/Python |
| `lib` | 4 | PostgreSQL, schema e duas migrations SQL |
| `payload` | 7 | Partes de materialização das páginas/código |
| `tools` | 155 | Patches, builders, testes, fontes intermediárias, plugin em ZIP e arquivos extraídos |
| `web` | 54 | Admin, Portal, JS/CSS e ZIPs de conector destinados a download |
| **Total** | **300** | O diff importou praticamente todo o projeto, e não apenas uma correção pequena |

**Limite importante:** a comparação de commits do GitHub exibe no máximo 300 arquivos. Por isso, a contagem integral foi comprovada **independentemente** nas árvores recursivas, e não inferida de uma listagem potencialmente cortada.

## 3. Achados e riscos para integração

| Prioridade | Achado comprovado ou limitação | Ação exigida antes de possível integração |
| --- | --- | --- |
| **Bloqueante** | `main` contém só `README.md` e `.gitignore`; a aplicação inteira está nos 300 arquivos importados. **Não foi comprovado que esse snapshot corresponde byte a byte ao código atualmente em Shard Cloud.** | Validar origem, versão e paridade **por processo separado e autorizado**. Não retarget/merge dos PRs para `main` automaticamente |
| **Alto** | `server.js` chama `initSchema(pool)`, `bootstrapAdmin()` e `applyRecoveryPassword()` antes de abrir a porta. Há risco de mutação de dados ao iniciar contra DB existente | Executar testes futuros somente com PostgreSQL sintético e totalmente isolado, depois de outra aprovação. **Nunca** testar contra `exe-pro-db` |
| **Alto** | `npm run build` na base encadeia materialização e dezenas de patches. `tools/connector-intake-460.js` contém fallback de download do Google Drive; histórico documenta instabilidade anterior do patch WordPress | Conservar os testes determinísticos e o mecanismo prebuilt opcional dos PRs seguintes. Revisar política de origem/cache de ZIP antes de release |
| **Alto** | Há **4 arquivos ZIP** adicionados, três sob `web/downloads` e um sob `tools/connector460`. O ZIP de v1.4.0 de `web/downloads` é idêntico (mesmo Git blob SHA) ao pacote de `tools/connector460` | Fazer auditoria estática do conteúdo dos ZIPs e dos plugins distribuíveis antes de publicação. Não pressupor que o conteúdo é seguro por estar no Git |
| **Médio** | `.env.example` apresenta variáveis secretas com **valores vazios** (`EXE_CLOUD_KEY`, `EXE_CLOUD_SECRET_KEY`, senhas e `DATABASE_URL`); `.gitignore` bloqueia padrões sensíveis conhecidos. **Não foi realizada auditoria completa de segredos em todos os blobs e ZIPs** | Manter repo privado, revisar conteúdo dos ZIPs e executar futura varredura independente. Não incluir secrets reais em GitHub |
| **Médio** | Documentação histórica contém referências à Cloudways e uma checklist `docs/EXE_PRO_4_CLOUDWAYS_PRODUCTION_CHECKLIST.md` que marca um merge de EXE PRO 4.0 como concluído. O **estado Git atual** mostra `main` ainda sem o código de aplicação | Tratar esses checkboxes como **históricos/não confiáveis para EXE PRO v4.4.0**. Preferir Git, CI e evidência da plataforma atual |
| **Médio** | CI de base usa `npm install` e Node 22. Versão reportada do runtime Shard (26.12.1) não foi reconfirmada no ambiente atual | Confirmar versão e estratégia de dependências em homologação isolada antes de trocar startup ou publicar |
| **Médio** | O parecer Fase 2 do snapshot menciona possível conflito global entre upload de 5 MiB e arquivo de 8 MiB. **Entretanto, na própria base importada, as rotas principais de upload do Portal chamam `portalReadJsonLarge` com limite de 12 MiB**. | **Não tratar o conflito como defeito reproduzido**. Testar rotas específicas somente em futura homologação autorizada |
| **Médio** | CI/estudos anteriores passaram em build e testes unitários locais, porém não confirmaram login, portal, anexos, jobs, pagamentos ou integrações contra aplicação executada | Exigir teste funcional com dados fictícios e integrações simuladas, após isolamento comprovado |
| **Médio** | SHA do ZIP de origem aparece no relatório `AUDITORIA_IMPORTACAO.md`; nesta auditoria **não foi possível reabrir/verificar novamente o ZIP de origem daquela importação**, apenas o Git atual | Considerar hash do relatório histórico uma evidência declarada, **não revalidada** nesta etapa |

### Fontes de código/relatórios abertas nesta auditoria

- `AUDITORIA_IMPORTACAO.md` — origem declarada, triagem estática e omissões do snapshot.
- `docs/AUDITORIA-FASE2-EXE-PRO-4.4.0.md` — 9 testes históricos aprovados e build repetido em ambiente local; **não reexecutados nesta revisão**.
- `docs/EXE_PRO_4_CLOUDWAYS_PRODUCTION_CHECKLIST.md` e `README_CLOUDWAYS.md` — conteúdo legado que pode divergir da plataforma atual.
- `package.json`, `server.js`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `.github/workflows/exe-pro-4-build-validation.yml`, `tools/connector-intake-460.js`.
- Árvores recursivas Git dos SHAs de `main`, primeiro commit e HEAD da branch de importação.

**Não há evidência suficiente nesta consulta para atribuir uma vulnerabilidade explorável ou comprovar correspondência entre o snapshot e o Shard Cloud.** Diferenciar riscos inferidos de problemas reproduzidos.

## 4. Relação dos PRs e prevenção de integração acidental

```text
main 839f478a... (2 arquivos)
  └── 845837e... [importação 299 arquivos]
      └── 2fdde5b... [documentação 1 arquivo] = auditoria/4.4.0-importacao
          └── PR #1 [headers Portal]
              └── PR #2 [prebuilt opt-in]
                  ├── PR #3 [auditoria de backups — ramo histórico paralelo]
                  └── PR #4 [manifesto v2]
                      └── PR #5 [pacote]
                          └── PR #6 [plano de homologação]
                              └── PR #7 [laboratório de dependências]
```

PRs **#1–#7** permaneceram rascunhos sem merge na última verificação; o PR #3 é apenas documentação histórica de backups e **não constitui dependência do fluxo prebuilt**. Este parecer não altera bases, estados, códigos ou títulos de nenhum deles.

**Proibição prática:** não fazer merge do PR #1 ou seus descendentes para `main` tratando-os como uma mudança pequena; o histórico ancestral carrega os 300 arquivos de importação. Não fazer cherry-pick cego; não apagar a branch de auditoria; não declarar o conteúdo já publicado.

## 5. Plano seguro de integração futura (proposta; nada executado)

### Gate A — comprovar fonte e paridade sem mudança de produção
1. Revisar origem do snapshot e comprovação de integridade do ZIP original; qualquer acesso a fontes reais/Shard Cloud exige aprovação separada.
2. Comparar versão/revisão do snapshot importado com a **versão realmente em execução**, por evidência autorizada e sem credenciais em documentação.
3. Auditar estaticamente pacotes ZIP/WordPress e scripts que baixam arquivos externos; validar licenças, segredos e dependências.
4. Examinar os 300 arquivos do inventário e diferenças de configuração; distinguir artefatos de build dos arquivos executados.

### Gate B — revisão de qualidade do código sem integrar branches
1. Confirmar que a cadeia `#1 → #2 → #4 → #5 → #6 → #7` é compatível com o snapshot que se pretende promover.
2. Confirmar evidências atuais de CI, as 93 entradas do manifesto e o pacote de teste; **não** presumir equivalência entre CI e homologação real.
3. Propor um plano de integração em branch temporária **somente após nova autorização específica**, com inventário preciso e rollback por ref; não alterar `main` agora.
4. Preservar relatórios de backups do PR #3, sem reabrir planos de rotina externa encerrados.

### Gate C — homologação real exclusivamente isolada (exige autorização distinta)
1. Laboratório de rede sem acesso a produção, PostgreSQL próprio de testes e dados fictícios, integrações externas totalmente simuladas.
2. Provar que `initSchema`, `bootstrapAdmin`, rotinas agendadas e notificações **não podem** afetar sistema/DB reais.
3. Só depois considerar autorização para start prebuilt em laboratório e testes `/health`, `/ready`, login Admin/Portal, anexos e CRM. Nenhuma execução nesta fase.
4. Revisar compatibilidade de Node, dependências, integridade, origem e distribuição do artefato.

### Gate D — decisão operacional separada
1. Preparar plano de mudanças/rollback e critérios de aceite de produto baseados em homologação.
2. Solicitar **aprovação explícita e separada para cada ação sensível**: merge, deploy, mudança de startup, SQL, backups, chaves, contas e webhooks.
3. Se qualquer fonte não corresponder à produção, **interromper** e voltar ao Gate A; nunca fazer reescrita total ou troca de arquitetura por suposição.

## 6. Resultado final e autorização

| Pergunta | Resposta |
| --- | --- |
| Os dois commits foram identificados e sua ancestralidade conferida? | **SIM** |
| Existe inventário completo sem truncamento dos arquivos novos? | **SIM — 300 arquivos** |
| A importação apagou ou editou os arquivos originais da `main`? | **NÃO** |
| A branch importada equivale comprovadamente à versão atualmente em produção? | **NÃO COMPROVADO** |
| O conjunto está pronto para merge/deploy? | **NÃO** |
| Foi executado servidor, SQL, PostgreSQL, migração, webhook, backup, deploy ou merge nesta etapa? | **NÃO** |

**Veredito:** a base é estruturalmente consistente e auditável no GitHub, mas **não deve ser integrada nem publicada sem comprovação de paridade e homologação isolada**. Esta é uma recomendação de segurança, não uma constatação de defeito do EXE PRO em produção.

**Artefatos desta revisão:** este parecer e o [inventário dos 300 arquivos](./INVENTARIO-COMPLETO-BASE-IMPORTACAO-EXE-PRO-4.4.0-2026-11-25.md), ambos na branch documental separada e preservados para consulta.

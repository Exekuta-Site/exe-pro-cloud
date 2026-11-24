# EXE PRO v4.4.0 — Auditoria Fase 2 (código importado)

Data: 24/11/2026. Escopo: snapshot importado do backup para a branch `auditoria/4.4.0-importacao` do repositório `Exekuta-Site/exe-pro-cloud`.

## Garantias e limites

- Testes executados **somente em cópias locais**, sem iniciar `server.js`, sem conexão com PostgreSQL e sem deploy ao Shard Cloud.
- A branch `main` não foi modificada e não houve configuração de webhook.
- Testes com **Node 22.16.0**, equivalente à família de versões usada no workflow de CI; o relatório da plataforma informa Node 26.12.1 em produção (necessita confirmação).
- Os arquivos incluíam uma cópia em cache do plugin WordPress; portanto o build local não precisou baixá-lo da internet.

## Resultados verificados

| Verificação | Resultado |
|---|---|
| `npm run build` em duas cópias independentes | **Passou em ambas** |
| Segundo build na mesma cópia | **Passou** |
| `node --test tools/whatsapp420/history.test.js tools/whatsapp420/cleanup.test.js tools/site440/lead.test.js` | **9/9 testes passaram** |
| SHA-256 `server.js` após builds independentes e segundo build | `db668c87f68305405804d9acfe1debe26861338fb59f67769643b6c9eb0092cc` |
| SHA-256 `web/index.html` após builds | `38d4ca6168b9ca6631e0e3df8274413d0e37fba95a99b2f54ecf07f134511871` |
| SHA-256 `web/portal.html` após builds | `0d5c507f5599de25783ca96f2b064087b64ab77172412767d4f8e5212ce5df7c` |

**Conclusão do build:** o snapshot é reproduzível no ambiente de teste com os artefatos em cache presentes. Isto **não** comprova segurança contra falhas no startup do Shard Cloud; a plataforma executa `npm run build` a cada inicialização conforme auditoria operacional. O resultado contradiz a generalização de que o build atual é sempre não reprodutível.

## Achados com evidências

1. **Alto — fragilidade operacional do startup.** `package.json` encadeia 33 comandos no build, executando `tools/materialize.js` e scripts `apply-*` antes do start. Uma falha no build impede o servidor de subir. O relatório anterior mostrou crash histórico em `tools/apply-wp-popup-460.js` (TDZ `oldBtn`). O snapshot atual já declara `oldBtn` antes de usá-lo; o erro histórico **não foi reproduzido** localmente.
2. **Alto — banco de produção sem restauração comprovada.** O ZIP não inclui dump do PostgreSQL e a auditoria operacional não comprovou backup gerenciado. Não é possível verificar isso pelo código do GitHub. Obter evidência e testar a restauração apenas em ambiente separado.
3. **Médio — cabeçalhos de segurança incompletos em rota específica.** `server.js:72–90` define CSP, X-Frame-Options e HSTS condicional na função `json`; `server.js:258–259` define esses controles para estáticos. Entretanto, a entrega direta de `web/portal.html` em `server.js:3601–3605` não usa CSP, X-Frame-Options nem HSTS nessa resposta. Logo, **a falta global de cabeçalhos relatada antes não se confirma**, mas a lacuna dessa rota merece correção mínima.
4. **Médio — limites de upload incompatíveis.** `server.js:15,99` impõe 5 MiB por corpo HTTP; `server.js:1183,1249` aceita 8 MiB como limite de arquivo no Portal. Uploads em JSON com base64 podem receber HTTP 413 antes da validação do limite anunciado.
5. **Médio — dependência remota potencial no build.** `tools/connector-intake-460.js` busca ZIP do Google Drive caso a cópia em cache esteja ausente; isso introduz dependência de rede e potencial variação de artefato se executado sem cache.
6. **Médio — monitoramento e falhas silenciosas.** `server.js:4132–4140` inicia jobs e usa `.catch(()=>{})` em alguns agendamentos. Ausência de handlers de processos não basta para concluir causa dos crashes históricos; recomendam-se logs consistentes, healthcheck e alerta externo.
7. **Baixo — versões e ambiente.** `package.json` usa 4.4.0; banner em `server.js:4127` ainda cita 3.9.1. CI usa Node 22 enquanto a auditoria operacional registrou Node 26. Confirmar runtime real antes de padronizar.

## Prioridades propostas (sem executar alterações)

**P0 — Proteção de dados:** comprovar backup recuperável do PostgreSQL e teste de restauração isolada.

**P1 — Startup seguro:** separar build de startup, desde que seja possível alterar a configuração de deploy sem risco; preservar os arquivos materializados e validar hashes em CI. Não trocar o comando do Shard Cloud antes de teste fora da produção.

**P1 — Segurança cirúrgica:** incluir os cabeçalhos necessários na rota direta do portal, mantendo compatibilidade com Meta/WordPress e todos os domínios, e acrescentar testes de regressão de headers.

**P2 — Robustez:** ajustar contrato de upload; ampliar testes de rota e portal; observabilidade dos jobs; unificar banner/versão e versões Node.

## Pendências

- Não há acesso neste teste à base PostgreSQL ou à plataforma de backups, métricas e logs em tempo real.
- Não foram testados login de verdade, APIs com autenticação, Portal, tarefas e WordPress ponta a ponta.
- Não foi executado `npm ci`, nem auditoria de vulnerabilidades em dependências via serviço externo.
- Não houve nenhuma correção ou publicação da aplicação.
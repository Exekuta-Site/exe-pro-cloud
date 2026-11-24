# EXE PRO v4.4.0 — Preparação de inicialização com artefato verificado

Data: 24/11/2026. **Somente branch de desenvolvimento, não implantado.**

## Objetivo

Reduzir a dependência do build mutável a cada reinício do serviço. **Nenhuma mudança foi feita no comando atual do Shard Cloud**: `npm run build && npm start` continua sendo o fluxo de produção relatado. A alteração abaixo é opt-in; não remove `npm run build`, `npm start` ou os scripts `tools/apply-*`.

## Ferramentas implementadas

- `npm run build:prebuilt`: executa o build original e, após sucesso, grava `.exe-pro-build-manifest.json`, com versão do pacote e SHA-256 de `server.js`, Admin, Portal, service worker e manifesto PWA.
- `npm run seal:prebuilt`: gera o manifesto para um build já validado (sem executar o servidor ou conectar ao banco).
- `npm run check:prebuilt`: falha com código diferente de zero se faltar manifesto, divergir a versão ou o hash dos artefatos, ou faltar um dos arquivos.
- `npm run start:prebuilt`: **apenas opcional**, valida o manifesto e, se tudo conferir, inicia `node server.js`. Não recompila nem altera arquivos.
- Manifesto excluído do Git por `.gitignore`: deverá acompanhar **o mesmo artefato de publicação previamente construído**, gerado no pipeline de release. Não é segredo, mas nunca reutilizar um manifesto de outra versão.
- Testes em `tests/prebuilt-artifact.test.js`: formato, integridade, idempotência, versão divergente, arquivo ausente e manifesto ausente.

## Garantias e limites

- A opção é propositalmente **desligada por padrão**. O Shard Cloud não deve receber o novo comando antes de termos um fluxo comprovado que empacote/entregue o artefato e seu manifesto na mesma versão.
- SHA-256 detecta mudança ou corrupção **em relação ao manifesto local**, mas não comprova autenticidade de fornecedor nem substitui assinaturas/atestação de pipeline.
- Se um script do build falhar, `npm run build:prebuilt` também falha; a vantagem futura depende de **compilar fora do runtime** e distribuir o artefato previamente testado.
- **Não realizamos** startup, autenticação, banco, migrações, saúde real, observabilidade ou simulação de crash em produção.
- O projeto é compatível com Node `>=22` no package; os testes foram feitos com Node 22.16.0. O relatório operacional indica Node 26.12.1 no Shard, a confirmar em homologação.

## Testes locais realizados (sem servidor e sem banco)

1. `node --test tests/prebuilt-artifact.test.js`: 6/6 passaram.
2. `npm run build:prebuilt` duas vezes: executado com sucesso.
3. `npm run check:prebuilt`: executado após ambos os builds, passou.
4. SHA-256 de `server.js`, `web/index.html`, `web/portal.html` e manifesto iguais entre as duas execuções.
5. Suíte combinada de Portal, WhatsApp, integração de leads e manifesto: **19/19 passaram**.

## Próxima etapa para homologação real

1. Confirmar o **backup recuperável do PostgreSQL** (documento irmão `VALIDACAO-BACKUP-POSTGRESQL-4.4.0.md`).
2. Validar o fluxo de distribuição de artefato e manifesto em ambiente de homologação isolado, sem tocar em `exe-pro-cloud`.
3. Confirmar versão real do Node, variável de porta, dependências e permissões de arquivos.
4. Executar `npm run check:prebuilt` na homologação, testar `/ready`, autenticação e fluxos críticos somente com dados fictícios.
5. Configurar monitoramento externo do `/ready`, separar erros do processo de crashes de contêiner e alertar em falhas persistentes.
6. Após revisão e autorização **específica de deploy**, planejar eventual substituição do comando de boot; nunca ativar automaticamente após merge.

# EXE PRO v4.4.0 — Etapa 3G: confirmação da operação de backups Core 1

**Início:** 24/11/2026 · **Situação:** etapa aberta, **aguardando decisões expressas do proprietário**.  
**Projeto:** `exe-pro-cloud` · **Banco de produção:** `exe-pro-db` (PostgreSQL).  
**Repositório:** `Exekuta-Site/exe-pro-cloud` (Private). Branch `auditoria/postgres-backups-etapa3`, PR #3 em rascunho.

**Escopo autorizado nesta etapa:** revisar decisões e atualizar documentação no GitHub. **NÃO** criar conta, bucket, chaves, rotinas, lembretes, backups; não baixar, restaurar, excluir, exportar ou transferir dados; não modificar Shard Cloud, GitHub `main`, aplicação, banco ou assinatura.

## 1. Itens para aprovação

| Campo de decisão | Recomendação / situação atual | Estado |
| --- | --- | --- |
| Operador titular | Pessoa nomeada pelo proprietário e efetivamente disponível para backup manual diário | **PENDENTE DE CONFIRMAÇÃO** |
| Operador substituto | Pessoa com acesso mínimo necessário e disponibilidade em ausências, feriados e fins de semana | **PENDENTE DE CONFIRMAÇÃO** |
| Custodiante de chaves | Pessoa ou função responsável pelo cofre e pela recuperação da chave de criptografia; pode ser titular se houver política de contingência independente | **PENDENTE DE CONFIRMAÇÃO** |
| Horário de execução | Todos os dias **19h**, fuso `America/Sao_Paulo` | **PROPOSTO, NÃO APROVADO** |
| Verificação e escalação | **19h30**, alertar aprovador em caso de falha/atraso | **PROPOSTO, NÃO APROVADO** |
| Destino externo | **Cloudflare R2 Standard**, bucket privado, criptografia do cliente antes do upload; Backblaze B2 como alternativa | **RECOMENDADO, NÃO APROVADO** |
| Retenção externa | Até 7 diárias + 4 semanais + 3 mensais; regra de expurgo a ser aprovada separadamente | **PROPOSTO, NÃO APROVADO** |
| RPO | Até 24h, somente se a execução diária for concluída; falta comprovação de restaurabilidade | **META PROPOSTA** |
| RTO | Definir após futuro teste isolado de restauração | **INDEFINIDO** |
| Limite de gastos externo | Potencial de uso gratuito de storage de pequena dimensão; volume real do arquivo e cobranças ainda não confirmados | **SEM LIMITE APROVADO** |

O titular informou plano Shard Cloud **Core 1**, que não inclui backup automático nativo do banco; tela do provedor mostra **1/8 backups**, com um registro disponível de **24/11/2026 11:20:52**, mas **sem teste de restauração**.

## 2. Proteção de identidades e segredos

- **NÃO armazenar no GitHub** telefones pessoais, contas, credenciais, strings `DATABASE_URL`, endereços privados de banco, chaves de criptografia ou dados de clientes.
- Se o proprietário indicar pessoas pelo nome em conversa, registrar no repositório **apenas a função designada e o estado da confirmação**; manter escala de contatos em registro administrativo com acesso restrito.
- Se o titular for o único operador e não existir substituto, registrar **LACUNA DE COBERTURA**. Não declarar que há proteção diária de fim de semana/feriado.
- Chaves e buckets externos somente poderão ser criados após aprovações separadas, revisão de titularidade, segurança e LGPD.

## 3. Critérios de confirmação da Etapa 3G

1. O proprietário confirma **quem será titular** e **quem será substituto**, ou declara ausência de substituto.
2. Confirma ou altera o horário de 19h (e checagem de 19h30) no fuso de Brasília; informa como cobrir fins de semana.
3. Escolhe **Cloudflare R2 Standard**, **Backblaze B2** ou **adiar armazenamento externo**, sem presumir que a infraestrutura já exista.
4. Define quem terá responsabilidade pela guarda/recuperação da chave e aceita ou ajusta a retenção externa.
5. A decisão é registrada como **aprovação de política**, **não como autorização de execução**. Nenhum recurso externo, download, backup ou deploy é iniciado automaticamente.

## 4. Próximo gate operacional (somente depois da decisão)

- Revisar com o proprietário dados ainda faltantes e um checklist de implementação do storage **com arquivos sintéticos**, caso venha a autorizar especificamente criação de conta/bucket.
- Para quaisquer operações com backup real, exigir autorização operacional distinta e nunca transmitir dados de produção por esta conversa ou GitHub.
- Um restore somente ocorrerá em instância PostgreSQL **separada e isolada**, após autorização específica, com jobs e integrações desligados.

**Conclusão até agora:** Etapa 3G preparada e documentada. **Não há ainda nomeação operacional nem aceite de horário ou fornecedor**. PR #3 permanece em rascunho e `main` não deve ser alterada.

### Referências internas
- [Etapa 3E — política operacional, responsabilidades e custos](./ETAPA-3E-POLITICA-OPERACIONAL-CORE1-CUSTOS-2026-11-24.md).
- [Etapa 3F — checklist de prontidão e gates de autorização](./ETAPA-3F-PRONTIDAO-IMPLANTACAO-BACKUP-POSTGRESQL-2026-11-24.md).
- [Relatório consolidado da Etapa 3](./ETAPA-3-AUDITORIA-BACKUP-POSTGRESQL-2026-11-24.md).

## 5. Encerramento a pedido do proprietário (24/11/2026)

**Decisão expressa:** encerrar o planejamento adicional de backups e retomar desenvolvimento do EXE PRO. **Etapa 3G encerrada sem implantação da rotina**; não exigir preenchimento de responsável, substituto, horário, R2/B2, retenção ou contratação como condição para retornar às correções do software.

**Backup existente:** a captura anterior mostrou 1/8 backups disponíveis para `exe-pro-db`, um de 24/11/2026 11:20:52. **Nenhuma ação foi executada no banco ou no backup**; o estado atual e sua integridade/recuperabilidade continuam não comprovados por restore.

**Documentação:** preservar Etapas 3B–3G, este registro e o PR #3 em rascunho como histórico, **não ativar** calendário, contas, buckets, downloads nem exclusões. Nunca interpretar planos de rotina como rotinas operacionais em funcionamento. Nenhum merge ou deploy.

**Próxima prioridade de desenvolvimento:** retomar a revisão do PR #1 (cabeçalhos de segurança do Portal) em branch isolada, sem publicar nada. A observação anterior de suposta incompatibilidade global 5 MB vs 8 MB no upload deve ser corrigida: `server.js` usa `portalReadJsonLarge` com limite de 12 MiB nos endpoints de upload do Portal, enquanto `readBody` de 5 MiB se aplica a outros endpoints. **Não alterar o upload sem erro efetivamente reproduzido**.

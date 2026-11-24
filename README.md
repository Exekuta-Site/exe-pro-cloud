# EXE PRO — Cloud

Repositório de trabalho do **EXE PRO v4.4.0**. O código de produção reside atualmente no projeto `exe-pro-cloud` do Shard Cloud.

## Situação da importação

- Repositório inicializado para auditoria e revisão.
- **O código-fonte ainda não foi importado.**
- O backup original está em análise; uma cópia preparada foi gerada para revisão.
- Importação integral pendente de mudança da visibilidade do repositório para **Private** e revisão de segredos.
- **NÃO configurar webhook de deploy**, GitHub Actions de publicação ou sincronização automática.
- Este repositório não deve ser tratado como fonte para deploy até validação do build e autorização explícita.

## Regras de proteção

1. Preservar banco de dados PostgreSQL, leads, clientes, integrações e dados existentes.
2. Não incluir `.env`, senhas, tokens, dumps, caches ou arquivos de produção sensíveis.
3. Desenvolver em branches separadas e revisar via Pull Requests.
4. Não fazer alterações na produção sem aprovação.
5. Validar o build que aplica scripts `tools/apply-*` de forma isolada antes do primeiro deploy.

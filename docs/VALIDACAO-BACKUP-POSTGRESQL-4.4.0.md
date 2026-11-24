# EXE PRO v4.4.0 — Evidência de backup do PostgreSQL

Data: 24/11/2026. **Status: AINDA NÃO COMPROVADO**.

## Fatos observados (não extrapolar)

- O relatório de leitura do Shard Cloud recebido pelo proprietário descreveu dois backups de arquivos do aplicativo, com datas de 03/11 e 23/11/2026, ambos sem `database_name` preenchido.
- O ZIP de origem utilizado para o GitHub não contém um dump verificável do PostgreSQL.
- O projeto declara PostgreSQL em `lib/postgres.js`; essa configuração **não prova** a existência de backups gerenciados pelo provedor.
- Não tivemos acesso ao painel de banco de dados, às políticas de retenção, ao armazenamento remoto, nem a um teste de restauração. **Não é correto afirmar nem que há nem que não há backup gerenciado.**

## Evidências mínimas solicitadas ao painel de PostgreSQL / suporte do Shard Cloud

1. Identificação **não secreta** da instância e do serviço de banco vinculado ao `exe-pro-cloud`, sem URL de conexão, senha ou token.
2. Tipo de proteção: snapshot, backup lógico, cópia física e/ou point-in-time recovery (PITR).
3. Data/hora e status da **última execução bem-sucedida do backup do banco**, distinguindo-o do backup de arquivos do app.
4. Cadência agendada, retenção, região/local de armazenamento, proteção contra exclusão e escopo das tabelas (sem exportar os registros).
5. Evidência de integridade e procedimentos documentados de restauração. Se o plano não fornecer restore testado, registrar como pendente.
6. Data e resultado do **teste de restauração em instância isolada**, que precisa ser autorizado separadamente; nunca usar o banco de produção como destino.

## Critérios de conclusão

- **Backup existente confirmado:** registro de execução bem-sucedida do PostgreSQL, data, retenção e escopo sustentados por evidência do provedor.
- **Recuperável confirmado:** restauração isolada concluída, versão PostgreSQL compatível, contagens/estrutura verificadas sem expor dados pessoais, e procedimento de recuperação documentado.
- **Pendente:** qualquer dado acima ausente. Backup de arquivos do app não atende a essa exigência.

## Operações expressamente proibidas nesta etapa

Não executar SQL de escrita, migração, reset, restart, criação/restauração de snapshot, dump com dados de clientes, rotação de credenciais ou alterações no banco, mesmo em nome de um teste. Solicitar autorização específica para operações futuras em ambiente isolado.

**Bloqueio de produção:** não publicar correções enquanto a recuperação do PostgreSQL não for comprovada e autorizada pelo responsável.

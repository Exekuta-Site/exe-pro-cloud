# EXE PRO Cloud 3.9.0 — Core Stability & Consolidation

## Objetivo
Consolidar a camada operacional do EXE PRO antes de novas expansões funcionais, reduzindo risco de regressões e tornando o estado do sistema observável.

## Saúde do Core
Novo módulo administrativo **Saúde do Core** com:
- versão do Core;
- PostgreSQL conectado;
- tamanho do banco;
- integridade das tabelas essenciais;
- quantidade de registros e journal de sincronização;
- instalações Windows vistas pelo Cloud;
- sessões administrativas e do Portal;
- notificações pendentes/falhas;
- sites WordPress com erro/suspensos;
- chamados abertos;
- volume de arquivos do Portal;
- relatórios SEO;
- perfis de cobrança recorrente;
- histórico recente dos jobs;
- eventos técnicos;
- versões de schema registradas.

## Diagnóstico exportável
Usuários com perfil operacional podem baixar um JSON de diagnóstico em:

`/api/web/core-diagnostics?download=1`

O diagnóstico não retorna chaves, tokens ou senhas. Credenciais são representadas somente por flags de configuração.

## Locks distribuídos
Os schedulers de:
- Notificações;
- WordPress Control;
- Financeiro Recorrente;

passam a usar `core_job_locks` no PostgreSQL.

Benefícios:
- evita execução concorrente em múltiplos processos;
- reduz chance de efeitos duplicados;
- registra cada execução;
- registra falhas e duração;
- permite inspeção pelo painel.

## Jobs
Admin e Super Admin podem executar manualmente:
- Notificações;
- WordPress Control;
- Financeiro Recorrente.

A execução manual também usa o mesmo lock distribuído.

## Eventos técnicos
Falhas de jobs e eventos importantes do Core são registrados em `core_runtime_events`.

Não são gravados segredos.

## Limpeza segura
Super Admin pode executar limpeza de:
- sessões Web expiradas;
- sessões Portal expiradas;
- guards de login antigos;
- job runs com mais de 90 dias;
- eventos técnicos com mais de 90 dias.

A limpeza não remove:
- clientes;
- leads;
- propostas;
- contratos;
- recebíveis;
- pagamentos;
- sites WordPress;
- arquivos do Portal;
- auditoria comercial.

## Registro de schema
Nova tabela `core_schema_versions` registra a aplicação da versão 3.9.0.

## Manifesto de módulos
Novo `tools/core390/module-manifest.json` centraliza os módulos esperados e tabelas essenciais.

Módulos registrados:
- CRM / Sync Core 3.6.9;
- Notificações 3.6.7;
- WordPress Client Control 3.7.1;
- Portal do Cliente 3.8.3;
- Relatórios SEO 3.8.2;
- Financeiro Recorrente 3.8.4.

## Build-check reforçado
O build agora valida:
- versão de `package.json` contra Server/Admin/Portal;
- marcadores de todos os módulos;
- tabelas essenciais no schema;
- JavaScript materializado com `node --check`;
- substituição dos schedulers antigos pelos schedulers com lock;
- SHA-256 dos principais artefatos materializados.

## Consolidação sem reescrita
A cadeia histórica de patches permanece por enquanto para manter rollback seguro e compatibilidade.

A 3.9.0 consolida:
- runtime;
- coordenação de jobs;
- diagnóstico;
- integridade;
- manifesto;
- validação de build.

Não há reescrita destrutiva do CRM nem migração de IDs.

## Banco
Novas tabelas:
- `core_schema_versions`;
- `core_job_locks`;
- `core_job_runs`;
- `core_runtime_events`.

Todas são aditivas.

## Compatibilidade
- PostgreSQL permanece central;
- Windows/offline continua funcionando;
- sincronização mantém IDs e versões;
- Portal permanece em `/portal/`;
- WordPress Connector continua 1.1.0;
- nenhuma chave existente precisa ser alterada.

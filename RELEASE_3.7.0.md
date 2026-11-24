# EXE PRO Cloud 3.7.0 — WordPress Client Control

## Objetivo
Integrar sites WordPress de clientes ao EXE PRO para monitoramento, suspensão temporária e reativação segura, vinculando a decisão ao Financeiro e à autorização contratual.

## Plugin EXE PRO Connector
A release inclui o plugin **EXE PRO Connector 1.0.0** para WordPress.

Recursos do plugin:
- conexão sem usuário/senha do WordPress;
- chave exclusiva por site;
- assinatura HMAC SHA-256;
- proteção contra replay por timestamp + nonce;
- endpoint de status;
- suspensão temporária;
- reativação;
- wp-admin acessível para administradores;
- reativação de emergência diretamente no WordPress;
- página temporária com HTTP 503 + Retry-After;
- nenhum conteúdo, tema, plugin ou banco é apagado.

## Central Sites WordPress
Novo módulo na Cloud:
- lista sites conectados por cliente;
- status Online / Suspenso / Erro;
- situação financeira;
- quantidade de dias em atraso;
- valor total vencido;
- testar conexão;
- suspender manualmente;
- reativar;
- editar regras;
- remover conexão;
- baixar o plugin diretamente pela Cloud.

## Segurança
- o EXE PRO nunca precisa da senha administrativa do WordPress;
- a chave de cada WordPress fica em `cloud_secrets`, criptografada com `EXE_CLOUD_SECRET_KEY`;
- chamadas remotas exigem assinatura HMAC;
- URLs precisam ser HTTPS públicas;
- localhost e IPs privados são rejeitados;
- redirects não são seguidos pelas chamadas remotas.

## Proteção contratual
Cada site possui uma marcação explícita:
**O contrato com este cliente permite suspensão por inadimplência.**

Sem essa marcação:
- suspensão manual fica bloqueada;
- suspensão automática não acontece.

## Automação financeira
Configuração global:
- automação ligada/desligada;
- carência padrão em dias;
- reativação automática;
- título e mensagem da página temporária;
- Retry-After.

Configuração por site:
- carência específica;
- auto suspensão;
- auto reativação;
- conexão ativa.

Quando a automação está ativa:
1. o EXE PRO verifica os recebíveis vinculados ao cliente;
2. se a cobrança ultrapassar a carência e o site tiver autorização contratual, o WordPress é suspenso;
3. quando não houver mais cobrança vencida, sites suspensos automaticamente podem ser reativados automaticamente.

A automação roda na Cloud. O PC local não precisa permanecer ligado.

## Banco
Nova tabela aditiva:
`wordpress_sites`

Nenhuma tabela existente é removida ou recriada.

## Compatibilidade
- PostgreSQL continua sendo o banco central;
- IDs do CRM permanecem intactos;
- sincronização Windows ↔ Cloud permanece compatível;
- o controle WordPress é Cloud-centric por segurança e disponibilidade.

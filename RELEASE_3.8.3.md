# EXE PRO Cloud 3.8.3 — Propostas + Contratos + Aceite no Portal

## Objetivo
Permitir que propostas e contratos sejam publicados no Portal do Cliente e recebam decisão registrada diretamente pelo cliente.

## Administração
Novo módulo **Aprovações Portal**:
- lista propostas e contratos;
- filtro por cliente;
- publicar/ocultar no Portal;
- visualizar conteúdo;
- acompanhar decisão;
- reenviar a versão atual para nova decisão.

## Portal do Cliente
Nova área **Propostas e contratos**.

### Propostas
O cliente visualiza:
- título;
- serviços;
- implantação;
- mensalidade;
- primeiro ciclo;
- validade;
- condições de pagamento;
- observações.

Ações:
- **Aprovar proposta**;
- **Recusar**.

Quando aprovada pelo Portal:
- a decisão fica registrada;
- o status da proposta é sincronizado como **Aprovada**;
- quando recusada, o status é sincronizado como **Recusada**.

### Contratos
O cliente visualiza:
- título;
- mensalidade;
- dia de vencimento;
- início/fim;
- serviços;
- observações.

Ações:
- **Aceitar contrato**;
- **Recusar**.

## Registro de decisão
Para aprovar/aceitar, o cliente precisa:
- informar nome completo;
- confirmar que leu e concorda com o documento.

O EXE PRO registra:
- usuário do Portal;
- nome informado;
- decisão;
- comentário;
- data/hora;
- snapshot JSON da versão decidida;
- SHA-256 do conteúdo;
- hash do IP;
- user-agent.

O IP não é armazenado em texto puro.

## Controle de versão
A decisão fica ligada ao hash do conteúdo.
Se proposta ou contrato for alterado depois da decisão:
- a decisão anterior continua no histórico;
- a tela sinaliza **Requer nova aprovação**;
- a equipe pode reenviar a versão atual ao cliente.

## Linha do tempo
A aprovação/recusa/aceite também entra na Linha do Tempo do Portal.

## PDF
Propostas e contratos podem ser impressos/salvos em PDF pelo navegador a partir do Portal.

## Segurança
- cliente só acessa documentos do próprio `lead_id`;
- apenas documentos publicados ficam disponíveis;
- a decisão exige sessão válida + CSRF;
- conteúdo aprovado é preservado como snapshot;
- alterações posteriores não reutilizam silenciosamente o aceite anterior.

## Observação jurídica
Este recurso implementa **aceite eletrônico e trilha de auditoria**.
Ele não é descrito como assinatura digital qualificada ICP-Brasil.

## Banco
Novas tabelas aditivas:
- `portal_documents`;
- `portal_document_decisions`.

Nenhuma tabela existente é removida ou recriada.

## Compatibilidade
- PostgreSQL continua central;
- sincronização Windows ↔ Cloud é preservada;
- IDs das propostas/contratos não mudam;
- Portal continua em `/portal/`;
- WordPress Connector permanece 1.1.0.

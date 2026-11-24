# EXE PRO Cloud 3.8.4 — Financeiro Recorrente Avançado

## Objetivo
Transformar os serviços mensais dos clientes em um fluxo financeiro recorrente mais completo, integrado ao CRM, notificações e Portal do Cliente.

## Perfis financeiros por cliente
Cada cliente pode configurar:
- perfil recorrente ativo/inativo;
- geração automática;
- fatura única consolidada ou cobrança por serviço;
- dia do vencimento;
- forma de pagamento;
- dias de carência;
- multa percentual;
- juros mensais;
- desconto antecipado;
- quantidade de dias para desconto antecipado;
- observações internas.

## Geração de cobranças
O motor usa os serviços mensais ativos de `clientServiceItems`.

Também existe compatibilidade com clientes antigos que tenham apenas `clientMonthlyAmount`.

A geração cria Recebíveis padrão do CRM com:
- `leadId`;
- descrição;
- valor;
- vencimento;
- status;
- forma de pagamento;
- `originKey`.

### Proteção contra duplicidade
Cada cobrança usa uma chave determinística por:
- cliente;
- período;
- serviço, quando a cobrança não for consolidada.

Gerar o mesmo mês novamente não duplica cobranças.

## Fatura consolidada
Quando a opção **Consolidar serviços** estiver ativa:
- todos os serviços mensais entram em uma única cobrança;
- os itens continuam registrados individualmente em `billing_invoice_items`;
- o cliente visualiza a composição completa no Portal.

Quando desativada:
- cada serviço gera uma cobrança própria;
- o vencimento pode acompanhar o dia definido no serviço.

## Encargos e desconto
A cobrança guarda uma fotografia das regras financeiras no momento da geração:
- multa;
- juros mensais;
- desconto antecipado;
- carência.

Alterar o perfil depois não muda silenciosamente uma cobrança antiga.

O saldo exibido considera:
- principal;
- desconto antecipado elegível;
- multa após a carência;
- juros proporcionais por dia;
- pagamentos já registrados.

## Pagamentos parciais
A equipe pode registrar:
- valor;
- data/hora;
- método;
- observação.

Resultados:
- pagamento parcial → Recebível fica **Parcial**;
- quitação do saldo calculado → Recebível fica **Pago**;
- pagamentos ficam em histórico próprio;
- Admin/Super Admin podem excluir um pagamento lançado incorretamente e o saldo/status são recalculados.

## Notificações
Depois da geração, o EXE PRO executa o planejamento de notificações financeiras já existente.

Assim, cobranças recorrentes entram na mesma régua de:
- pré-vencimento;
- vencimento;
- atraso;
- confirmação de pagamento, quando habilitada.

O envio continua respeitando consentimento do cliente e configuração dos canais oficiais.

## Automação
Clientes com:
- perfil salvo;
- perfil ativo;
- **Gerar cobranças automaticamente** habilitado;

são processados pelo scheduler Cloud.

O scheduler roda de forma idempotente a cada 6 horas e tenta garantir a cobrança do mês atual sem criar duplicidades.

## Portal do Cliente
Perfis Proprietário e Financeiro passam a visualizar:
- mensalidades recorrentes;
- composição por serviço;
- principal;
- pagamentos registrados;
- desconto;
- multa;
- juros;
- saldo atualizado;
- situação de atraso.

Marketing e Visualizador continuam sem acesso financeiro.

## Cliente 360
O Cliente 360 ganha um resumo do financeiro recorrente:
- valor mensal;
- cobranças abertas;
- total recebido;
- saldo atual.

## Banco
Novas tabelas aditivas:
- `billing_profiles`;
- `billing_invoices`;
- `billing_invoice_items`;
- `billing_payments`;
- `billing_runs`.

Nenhuma tabela existente é removida ou recriada.

## Compatibilidade
- PostgreSQL continua central;
- Recebíveis gerados entram em `entities` e `changes`;
- IDs/versionamento continuam no modelo atual;
- Windows ↔ Cloud continua compatível;
- Portal continua em `/portal/`;
- WordPress Connector permanece 1.1.0.

## Observação sobre multa/juros
Os percentuais são configuráveis porque regras contratuais e legais variam.
A equipe deve usar somente condições previstas no contrato e aplicáveis ao relacionamento com o cliente.

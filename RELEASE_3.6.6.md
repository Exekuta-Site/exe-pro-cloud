# EXE PRO Cloud 3.6.6 — Central Comercial Inteligente + Follow-up

## Objetivo
Transformar a base de leads em uma fila comercial priorizada, com próximo passo claro e menos oportunidades esquecidas.

## Central Comercial
- KPIs de Leads quentes, Follow-ups atrasados, Follow-ups de hoje, Sem contato, Leads parados e Propostas abertas;
- filtros por prioridade comercial;
- ordenação automática por urgência + Lead Score;
- cartões com status, responsável, tentativas, próxima ação e última interação;
- identificação visual de atraso, hoje, lead quente, lead parado, sem contato e proposta aberta.

## Ações rápidas
- abrir Lead 360;
- gerar mensagem comercial;
- abrir WhatsApp com mensagem preparada;
- marcar como contatado;
- agendar follow-up em +1, +2 ou +7 dias;
- concluir/remover agenda;
- abrir Propostas.

## Regras comerciais
O Painel Mestre passa a configurar:
- primeiro contato em horas;
- retorno após ausência de resposta;
- quantidade de dias para considerar um lead parado;
- prazo de retorno de proposta;
- horário padrão do follow-up;
- ativação/desativação das regras.

O botão **Aplicar regras** cria agendas somente após confirmação do usuário. Nenhuma mensagem é enviada automaticamente.

## Lead 360
O topo do Lead 360 passa a mostrar:
- Lead Score;
- origem;
- presença digital;
- avaliação Google;
- situação da agenda;
- ações rápidas de mensagem, WhatsApp, contato e follow-up.

## Dashboard
Novo funil comercial:
Prospectados → Contatados → Qualificados → Com proposta → Clientes,
com taxa de passagem entre as etapas.

## Compatibilidade
- PostgreSQL e schema permanecem intactos;
- IDs e sincronização das entidades permanecem compatíveis;
- regras comerciais ficam junto ao branding/configuração do Painel Mestre;
- lead passa a aceitar também lastContactChannel e lastContactNote no payload JSONB.

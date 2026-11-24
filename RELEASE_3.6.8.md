# EXE PRO Cloud 3.6.8 — Paridade do cadastro de cliente

## Objetivo
Eliminar a diferença entre o modal **Novo cliente** da versão Windows e o cadastro simplificado da Cloud.

## Novo cliente na Cloud
Agora o formulário inclui:
- nome / nome fantasia;
- razão social;
- CNPJ / CPF;
- contato principal;
- cargo / função;
- e-mail;
- telefone;
- WhatsApp;
- Telegram;
- site;
- Instagram;
- Facebook;
- endereço;
- cidade;
- UF;
- responsável interno;
- cliente desde;
- origem;
- situação;
- serviços contratados / em carteira;
- perfil / contexto do cliente;
- observações internas.

## Cadastro unificado
Antes de criar um novo registro, a Cloud procura um Lead compatível por:
- CNPJ/CPF; ou
- nome + telefone/WhatsApp.

Se encontrar:
- Lead: pode converter o mesmo registro para Cliente;
- Cliente existente: pode atualizar o cadastro existente.

Isso preserva o histórico e evita duplicidade.

## Financeiro inicial
Para perfis com permissão financeira:
- implantação / projeto inicial;
- mensalidade;
- primeiro vencimento;
- dia mensal;
- duração em meses;
- forma de pagamento.

Quando informado:
- implantação gera um recebível de Projeto;
- mensalidade gera um Contrato recorrente;
- a primeira mensalidade é criada e vinculada ao contrato.

## Compatibilidade
- nenhuma tabela PostgreSQL existente foi removida;
- não altera IDs de leads/clientes;
- sincronização Windows ↔ Cloud permanece compatível;
- foram apenas ampliados campos permitidos no payload JSONB de Lead e Receivable.

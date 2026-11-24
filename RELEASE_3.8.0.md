# EXE PRO Cloud 3.8.0 — Portal do Cliente

## Objetivo
Criar uma área separada do painel administrativo para que cada cliente acompanhe sua própria operação sem ter acesso ao CRM interno, prospecção, outros clientes ou controles administrativos.

## Portal
Rota atual:
- `/portal/`

Preparado também para:
- `portal.exekuta.com.br`

O subdomínio precisa ser adicionado no Cloudways/DNS antes de ser usado publicamente.

## Acessos por cliente
Um cliente pode possuir vários usuários.

Perfis disponíveis:
- **Proprietário** — visão completa do portal;
- **Financeiro** — serviços + financeiro;
- **Marketing** — serviços, sites e projetos, sem valores financeiros;
- **Visualizador** — visão operacional sem financeiro.

Cada usuário do portal possui:
- login próprio;
- senha própria;
- status ativo/inativo;
- cliente vinculado;
- perfil de acesso;
- registro do último login.

## Segurança
O Portal do Cliente não reutiliza a sessão administrativa.

Foram criadas:
- `portal_users`;
- `portal_sessions`;
- `portal_login_guard`.

Recursos:
- senha com scrypt;
- sessão HttpOnly;
- cookie Secure + SameSite=Lax;
- CSRF para operações autenticadas;
- bloqueio temporário após tentativas repetidas de login;
- cada sessão fica presa a um único `lead_id`;
- APIs do portal sempre filtram os dados pelo cliente autenticado.

## Visão geral
O cliente visualiza:
- empresa;
- status;
- quantidade de serviços ativos;
- sites conectados;
- mensalidade, quando o perfil permite;
- próximo vencimento, quando permitido;
- projetos;
- contato de suporte.

## Serviços e sites
O portal usa a carteira `clientServiceItems` criada na versão 3.7.1.

Exibe:
- serviço;
- site/domínio;
- preço quando o perfil permite;
- periodicidade;
- vencimento;
- status.

Também mostra os sites conectados ao WordPress Client Control, porém sem expor botões administrativos de suspensão/reactivação.

## Financeiro
Disponível somente para Proprietário e Financeiro.

Exibe:
- cobranças;
- vencimentos;
- valores;
- forma de pagamento;
- status;
- total em aberto;
- total em atraso;
- próximo vencimento;
- chave PIX da agência, quando cadastrada.

## Projetos
Disponível para Proprietário, Marketing e Visualizador.

Exibe:
- título;
- status;
- progresso;
- prazo;
- resumo público do projeto.

## Administração
Novo módulo **Portal do Cliente** no EXE PRO Cloud:
- criar acesso;
- editar acesso;
- redefinir senha;
- ativar/desativar;
- remover acesso;
- abrir/copiar o endereço do portal.

O Cliente 360 também ganha um bloco **Acessos do cliente**.

## Compatibilidade
- nenhuma tabela existente foi removida;
- IDs do CRM permanecem intactos;
- PostgreSQL continua central;
- Windows ↔ Cloud permanece compatível;
- Portal é Cloud-centric para poder funcionar 24h sem depender do PC local.

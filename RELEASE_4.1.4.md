# EXE PRO Cloud 4.1.4 — Roteamento persistente

## Objetivo

Permitir que cada módulo administrativo tenha uma URL própria e permaneça aberto após atualizar o navegador, sem alterar a base de dados nem a sincronização Windows ↔ Cloud.

## Rotas

- `/dashboard`
- `/clientes`
- `/sites-wordpress`
- `/financeiro`
- `/projetos`
- `/seo`
- `/configuracoes`
- `/tarefas`
- `/notificacoes`
- `/saude-core`

## Comportamento

- A navegação interna atual continua usando o mesmo motor `openSec`.
- O endereço do navegador é atualizado com History API, sem recarregar a aplicação.
- O servidor retorna o shell da aplicação para as rotas administrativas.
- A atualização da página mantém o módulo aberto.
- Filtros, seleções e abas compatíveis são guardados apenas na sessão atual do navegador.
- A rota `/portal` continua isolada e não é capturada pelo roteamento administrativo.
- O Service Worker recebe uma nova versão de cache para evitar servir o shell anterior.

## Compatibilidade

- PostgreSQL, sincronização Windows ↔ Cloud, Portal, Financeiro, Tarefas, SEO e WordPress permanecem preservados.
- Nenhuma tabela ou dado existente é removido.
- A produção `main` não é alterada por esta branch.

# EXE PRO Cloud 3.8.2 — Relatórios SEO + Portal

## Objetivo
Entregar relatórios SEO mensais dentro do EXE PRO e disponibilizá-los diretamente no Portal do Cliente.

## Relatórios SEO no EXE PRO
Novo módulo **Relatórios SEO**:
- relatório por cliente e site;
- período inicial/final e rótulo do mês;
- status Rascunho ou Publicado;
- resumo executivo;
- destaques;
- próximas ações.

## Métricas
Campos disponíveis:
- cliques orgânicos;
- impressões;
- CTR;
- posição média;
- sessões;
- usuários;
- conversões;
- palavras-chave Top 10;
- avaliação Google;
- número de avaliações;
- PageSpeed Mobile/Desktop;
- LCP, CLS e INP por estratégia.

## Palavras-chave
Cada relatório pode ter até 500 palavras-chave com:
- termo;
- posição atual;
- posição anterior;
- cliques;
- impressões;
- landing page.

Também existe importação CSV para acelerar o uso de exportações do Search Console.

## PageSpeed
Integração com o endpoint oficial PageSpeed Insights v5:
- Mobile;
- Desktop;
- Performance Score;
- LCP;
- CLS;
- INP.

A API key é opcional. Quando configurada pelo Super Admin, fica criptografada em `cloud_secrets`.

## Portal do Cliente
O Portal ganha a área **Relatórios SEO**:
- lista de relatórios publicados;
- métricas principais;
- resumo executivo;
- destaques;
- próximas ações;
- palavras-chave;
- performance PageSpeed;
- SEO local;
- botão **Imprimir / PDF**.

Somente relatórios com status **Publicado** ficam visíveis ao cliente.

## PDF
Nesta versão o PDF é gerado pela impressão do navegador:
- layout específico para impressão;
- elementos administrativos ocultos;
- cartões e tabelas otimizados para papel.

Não foi adicionado um gerador PDF externo no servidor.

## Google Search Console e GA4
A estrutura do relatório já recebe os dados de Search Console e Google Analytics.
Nesta versão, essas métricas são inseridas manualmente e as palavras-chave podem ser importadas por CSV.

A conexão OAuth automática com Google Search Console / GA4 fica separada porque depende das credenciais Google Cloud/OAuth da agência e deve ser configurada sem compartilhar segredos em chat.

## Banco
Novas tabelas aditivas:
- `seo_reports`;
- `seo_keywords`;
- `seo_pagespeed_runs`.

Nenhuma tabela existente foi removida ou recriada.

## Compatibilidade
- PostgreSQL continua central;
- Portal continua em `/portal/`;
- IDs do CRM não mudam;
- Windows ↔ Cloud continua compatível;
- WordPress Connector permanece 1.1.0.

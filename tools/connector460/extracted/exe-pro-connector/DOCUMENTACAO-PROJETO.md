# DOCUMENTACAO-PROJETO.md

# Nome do Plugin

- Nome atual: EXE PRO Connector
- Versão: 1.3.0
- Autor: Alessandro Pimentel
- Última atualização: 2026-10-14

# Atualização 1.2.1

Foi adicionado controle manual de manutenção pelo painel WordPress.

## Nova funcionalidade

Administradores podem:
- Desativar o site manualmente.
- Reativar o site.
- Informar motivo da manutenção.
- Registrar responsável e data da ação.

## Segurança

Utilizados:
- Nonce WordPress.
- manage_options.
- Sanitização de entradas.
- Escape de saída.

## Arquivo principal

- exe-pro-connector.php

Responsável por:
- Administração.
- REST API.
- Controle de suspensão.
- Configurações.

## Histórico

## Versão 1.2.1
- Controle manual de manutenção adicionado.

## Versão 1.2.0
- Preparação arquitetural inicial.


## Atualização arquitetural - 2026-10-14

Foi criada a base inicial da arquitetura modular com `includes/Core/Loader.php` e `includes/Core/Plugin.php`. A compatibilidade com o fluxo existente foi preservada nesta etapa.


## Atualização 1.3.0

- Migração arquitetural progressiva iniciada para separação de responsabilidades.
- Novas camadas Frontend e Settings adicionadas mantendo compatibilidade.


## FASE 2.3 - Migração real das responsabilidades

- Camada de autenticação preparada para receber validação HMAC isolada.
- Controladores REST e módulos administrativos mantidos como pontos de entrada independentes.
- Migração realizada de forma progressiva para preservar compatibilidade.


## FASE 2.3 - Migração real de responsabilidades

- Registro dos módulos REST e Administração como camadas próprias de responsabilidade.
- Mantida compatibilidade dos callbacks existentes.


## FASE 2.3.6-B - Migração da Administração

- Hooks administrativos transferidos para includes/Admin/Admin.php.
- Mantida compatibilidade temporária com a classe principal durante a transição.


## FASE 3.0 — Módulo de Relatórios Técnicos

- Criada estrutura inicial do módulo Reports.
- Adicionada área administrativa de Relatórios.


## FASE 3.1 — Analisadores técnicos iniciais

- Implementadas análises iniciais de SEO, desempenho e experiência.
- Adicionada geração inicial de dados do relatório.


## FASE 3.2 — Dashboard visual de relatórios

- Criado painel visual inicial do relatório técnico.
- Adicionada pontuação geral e organização dos indicadores.


## FASE 3.3 — Exportação PDF

- Criado módulo de exportação de relatórios.
- Adicionado fluxo de download seguro para relatórios.


## FASE 3.4 — PDF Profissional EXE PRO

- Evolução do exportador de relatórios.
- Estrutura preparada para relatórios PDF corporativos.

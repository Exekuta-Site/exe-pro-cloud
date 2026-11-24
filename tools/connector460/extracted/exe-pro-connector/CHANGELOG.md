# Versão 1.4.0 — Módulo de Pop-up remoto (2026-11-04)

- Adicionado módulo isolado `EXE_PRO_Popup`, com configuração separada e desativado por padrão.
- Adicionadas rotas autenticadas `GET/POST /exe-pro/v1/popup` com HMAC já existente.
- Inserção acessível e responsiva no frontend; frequência por sessão, 24h ou cada visita.
- Adicionado controle manual em Configurações > EXE PRO Pop-up.
- Preservadas opções, slugs, endpoints e callbacks legados de suspensão/status/reativação.
- Reutilizada a rotina legada de limpeza de cache; CDNs externos exigem verificação adicional.
- Integração do app requer alteração no backend/frontend EXEKUTA; não incluída no ZIP do WordPress.
- Validação: lint PHP/JS e testes com mocks; sem ambiente WordPress real integrado nesta entrega.

---

# CHANGELOG

Histórico de versões do plugin.

---

# Versão Atual: 1.3.0

Data: 2026-10-14

Status: Em desenvolvimento / refatoração arquitetural

## Adicionado

- Criados módulos iniciais REST, Security e Admin.
- Adicionada camada de carregamento dos módulos arquiteturais.

## Alterado

- O bootstrap passou a delegar inicialização para módulos separados.

## Corrigido

- Nenhuma correção funcional registrada.

## Removido

- Nenhuma funcionalidade removida.

## Segurança

- Mantida compatibilidade com autenticação existente durante migração progressiva.

---

# CHANGELOG

Histórico de versões do plugin.

---

# Versão Atual: 1.2.1

Data: 2026-10-14

Status: Em desenvolvimento

## Adicionado

- Botão administrativo DESATIVAR SITE AGORA.
- Botão administrativo REATIVAR SITE.
- Controle manual de manutenção pelo painel WordPress.
- Registro do tipo de suspensão manual ou remota.
- Registro de data e hora da manutenção.
- Registro do administrador responsável.
- Registro do motivo da manutenção.

## Alterado

- Evoluído o controle de suspensão para diferenciar origem manual e remota.

## Corrigido

- Nenhuma correção de bug registrada.

## Removido

- Nenhuma funcionalidade removida.

## Segurança

- Adicionados nonces para ações administrativas.
- Mantido controle de capacidade manage_options.
- Mantida sanitização e escape de dados.

---

# Histórico de Versões Anteriores

## Versão 1.2.0

Data: 2026-10-14

### Alterações:
- Diagnóstico técnico e preparação arquitetural.

### Arquivos modificados:
- exe-pro-connector.php

### Observações:
- Base preparada para evolução.

---

# Próxima Versão Planejada

Versão: 1.3.0

Objetivo:
Refatoração arquitetural modular.

Alterações previstas:
- Separação de responsabilidades.
- Camadas Core, REST, Security, Admin e Frontend.


---

# Versão 1.3.0 (Planejada/Em desenvolvimento)

Data: 2026-10-14

### Alterações:

- Início da preparação da arquitetura modular.
- Adição da camada inicial de carregamento Core.

### Arquivos modificados:

- `exe-pro-connector.php`
- `includes/Core/Loader.php`
- `includes/Core/Plugin.php`

### Observações:

- Alteração incremental para reduzir riscos.


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

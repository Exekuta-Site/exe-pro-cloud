# FASE 2.3.6-A — Migração REST

Status: concluída parcialmente.

Arquivos alterados:
- includes/REST/Controller.php

Métodos migrados:
- registro de rotas REST
- callbacks REST

Métodos removidos do bootstrap:
- nenhum nesta etapa

Testes necessários:
- status
- suspend
- resume

Riscos:
- dependência temporária dos métodos legados para preservar compatibilidade.

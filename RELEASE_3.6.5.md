# EXE PRO Cloud 3.6.5 — Prospecção Inteligente + Lead Score

## Objetivo
Concluir a aproximação da Prospecção Cloud com a versão Windows e transformar os resultados em uma fila comercial mais útil.

## Lead Score
A Cloud passa a usar a mesma lógica-base da versão local:
- base: 20 pontos;
- telefone: +25;
- site: +20;
- avaliação 4,0 ou maior: +12;
- 20 ou mais avaliações: +8;
- Instagram encontrado: +8;
- Facebook encontrado: +7;
- máximo: 100 pontos.

Os cards mostram a pontuação, a faixa comercial e os fatores que contribuíram para o score.

## Prospecção
- filtros rápidos: Todos, Leads quentes, WhatsApp provável, Com site e Sem site;
- WhatsApp provável usa o mesmo critério da versão Windows para número móvel brasileiro;
- botão Gerar mensagem;
- botão WhatsApp rápido;
- botão Encontrar canais usando a busca Cloud/Serper já configurada;
- presença digital exibida no card;
- links Site, Maps, Google, Instagram e Facebook quando disponíveis;
- Salvar todos, Salvar todos + CSV e CSV respeitam o filtro atual.

## CRM
Novos leads passam a salvar, quando disponíveis:
- Place ID;
- Google Maps;
- avaliação e quantidade de avaliações;
- foto e atribuição;
- categoria;
- status aberto/fechado;
- Lead Score e faixa;
- pesquisa de origem e data da prospecção;
- presença digital e WhatsApp provável;
- Instagram/Facebook encontrados.

Ao reencontrar uma empresa já existente, somente os metadados de prospecção e campos vazios são atualizados; status, responsável, observações comerciais e demais campos de operação são preservados.

## Compatibilidade
Não altera o schema do PostgreSQL nem IDs das entidades. Apenas amplia a lista de campos permitidos no payload de Lead já armazenado em JSONB.

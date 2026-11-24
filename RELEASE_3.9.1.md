# EXE PRO Cloud 3.9.1 — Tarefas, Equipe e SLA

## Objetivo
Transformar a operação do EXE PRO em um fluxo executável e acompanhável:

Cliente → Projeto → Tarefa → Responsável → Prazo → Chamado → Portal.

## Novo módulo Tarefas & SLA
A Cloud ganha uma central própria com:

- quadro por status;
- visão em lista;
- visão Equipe & SLA;
- filtros por cliente;
- filtros por responsável;
- filtros por status;
- filtros por prioridade;
- fila pessoal.

## Tarefas
Cada tarefa pode registrar:

- cliente;
- projeto;
- chamado;
- título;
- descrição;
- responsável;
- prioridade;
- status;
- prazo operacional;
- prazo SLA;
- visibilidade no Portal;
- checklist;
- comentários;
- tempo trabalhado.

Status:

- A fazer;
- Em andamento;
- Aguardando cliente;
- Bloqueada;
- Concluída;
- Cancelada.

Prioridades:

- Urgente;
- Alta;
- Normal;
- Baixa.

## SLA
O SLA é configurável por prioridade.

Padrão inicial:

- Urgente: 4 horas;
- Alta: 8 horas;
- Normal: 24 horas;
- Baixa: 72 horas.

A configuração também define o percentual restante em que a tarefa entra em alerta.

Estados calculados:

- Dentro do prazo;
- SLA em atenção;
- SLA estourado;
- Concluído no prazo;
- Concluído fora do prazo;
- Sem SLA.

Nesta versão, a contagem usa horas corridas.

## Equipe
Responsáveis são usuários ativos do EXE PRO Cloud.

A visão Equipe & SLA mostra:

- tarefas ativas;
- tarefas com SLA estourado;
- tempo acumulado;
- distribuição de carga.

Também há indicador de tarefas sem responsável.

## Checklist
Cada tarefa possui checklist próprio.

Cada item pode:

- ser concluído;
- permanecer pendente;
- ser marcado como visível ou interno para o Portal.

O progresso percentual é calculado automaticamente.

## Comentários
Equipe e cliente podem conversar dentro da tarefa.

Comentários da equipe podem ser:

- internos;
- visíveis no Portal.

Comentários enviados pelo cliente são sempre visíveis no contexto da tarefa.

Quando o cliente responde uma tarefa em **Aguardando cliente**, ela volta para **Em andamento**.

## Tempo trabalhado
A equipe pode registrar:

- minutos;
- data/hora;
- observação.

O tempo aparece:

- na tarefa;
- no resumo da operação;
- na carga da equipe.

## Integração com Chamados
Chamados do Portal podem gerar uma tarefa diretamente.

O sistema:

- copia cliente;
- copia assunto;
- copia descrição;
- mantém vínculo com o ticket;
- deixa a tarefa pronta para distribuição.

Há proteção para evitar criar outra tarefa ativa para o mesmo chamado.

## Projeto
A tarefa pode ser vinculada a um projeto existente do cliente.

O sistema valida se o projeto pertence ao cliente selecionado.

## Portal do Cliente
Nova área **Acompanhamento**.

O cliente vê somente tarefas explicitamente publicadas.

São exibidos:

- título;
- descrição pública;
- projeto;
- status;
- prioridade;
- prazo;
- checklist público;
- percentual concluído;
- comentários públicos.

O cliente pode responder diretamente pela tarefa.

Detalhes internos de SLA e tempo da equipe não são expostos no Portal.

## Dashboard do Portal
O Portal passa a mostrar:

- tarefas ativas;
- em andamento;
- aguardando cliente;
- concluídas.

## Cliente 360
O Cliente 360 ganha resumo operacional de tarefas e atalho para a central filtrada pelo cliente.

## Linha do Tempo
Tarefas públicas entram na Linha do Tempo do Portal com sua última atualização e status.

## Core 3.9
O módulo **Tarefas, Equipe e SLA** entra no manifesto de módulos do Core.

Novas tabelas passam a ser verificadas pelo build e pela Saúde do Core.

## Banco
Novas tabelas aditivas:

- `task_items`;
- `task_checklist`;
- `task_comments`;
- `task_time_logs`.

Nenhuma tabela existente é removida ou recriada.

## Segurança
- cliente só acessa tarefa do próprio `lead_id`;
- somente tarefas `portal_visible=TRUE` são retornadas ao Portal;
- comentários do Portal exigem sessão + CSRF;
- checklist pode ocultar itens internos;
- responsável precisa ser usuário ativo do EXE PRO;
- vínculos com projeto/chamado são validados contra o cliente.

## Compatibilidade
- PostgreSQL continua central;
- Windows/offline continua preservado;
- CRM e IDs existentes não mudam;
- Portal continua em `/portal/`;
- Core 3.9.0 permanece ativo e é evoluído para 3.9.1;
- WordPress Connector permanece 1.1.0.

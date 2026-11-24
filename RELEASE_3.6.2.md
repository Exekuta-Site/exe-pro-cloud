# EXE PRO Cloud 3.6.2 — Visual Refinement

Release de acabamento visual sobre a paridade Windows/Cloud da 3.6.1.

## O que mudou
- refinamento do cabeçalho e das ações superiores;
- sidebar com hierarquia, espaçamento e estados mais consistentes;
- cards/KPIs com dimensões e contraste uniformes;
- formulários e campos com melhor leitura e foco;
- Prospecção reorganizada para desktop, tablet e celular;
- fontes de prospecção apresentadas como controles mais claros;
- cards de resultados com melhor hierarquia e ações alinhadas;
- tabelas com cabeçalho fixo e leitura melhor;
- Pipeline, alertas, modais e toasts com acabamento consistente;
- foco por teclado e respeito a prefers-reduced-motion;
- cache PWA atualizado para 3.6.2.

## Compatibilidade
Esta release não altera PostgreSQL, schema, IDs, API de sincronização nem regras de negócio.

A instalação Windows/local continua compatível com a Cloud. Não substitua nem apague:
%LOCALAPPDATA%\ProspectaLocal

## Deploy
Cloudways Velocity permanece com auto-deploy na branch main.
A release deve entrar em produção por um único merge para evitar fila de deploys.

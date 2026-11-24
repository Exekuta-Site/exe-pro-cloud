# EXE PRO Cloud 3.6.9 — Clientes + Mensalidade + Exclusão sincronizada

## Correções principais
- Carteira de Clientes agora possui **Editar**, **360°** e **Excluir**.
- A coluna antes exibida como valor genérico passa a mostrar a **mensalidade recorrente** do cliente.
- O cadastro/edição grava `clientMonthlyAmount`, dia de cobrança e forma de pagamento diretamente no Cliente.
- Contratos criados pela Cloud passam a manter `leadId`.
- Recebíveis criados pela Cloud passam a manter `leadId`, `contractId` e `originKey`.

## Causa do problema da mensalidade
A versão 3.6.8 criava Contrato/Recebível no cadastro inicial, mas alguns campos de vínculo usados no payload Web não estavam liberados pela whitelist do servidor. Por isso o valor podia existir no Financeiro/Contrato sem ficar corretamente associado ao Cliente para cálculo e exibição.

## Edição
O botão **Editar** abre o mesmo cadastro completo da versão 3.6.8, preenchido com os dados atuais. Ao salvar:
- atualiza o Cliente;
- atualiza ou cria o Contrato recorrente;
- atualiza/cria a cobrança mensal vinculada;
- preserva o mesmo ID e histórico.

## Exclusão
A exclusão é lógica (tombstone), com incremento de versão e registro no journal `changes`.
Assim, a exclusão participa da sincronização Windows ↔ Cloud.

Se houver registros vinculados, o usuário recebe um segundo aviso antes de excluir também propostas, projetos, contratos e recebíveis vinculados.

## Compatibilidade
- nenhuma tabela existente é apagada;
- IDs existentes são preservados;
- PostgreSQL continua como banco central;
- sincronização permanece compatível.

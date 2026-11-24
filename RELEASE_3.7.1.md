# EXE PRO Cloud 3.7.1 — Serviços por Site + WordPress Maintenance Designer

## Serviços por site e valor
O cadastro de Cliente passa a aceitar uma carteira estruturada por serviço.

Cada item pode ter:
- serviço;
- site / domínio;
- valor;
- periodicidade: Mensal, Único ou Anual;
- dia de vencimento;
- status: Ativo, Pausado ou Encerrado.

Os itens são salvos em `clientServiceItems` no próprio payload do Cliente.

### Total mensal
Quando existir pelo menos um serviço estruturado:
- o total mensal do Cliente é a soma dos serviços Ativos com periodicidade Mensal;
- o campo de mensalidade é atualizado automaticamente;
- o contrato recorrente e a cobrança mensal usam esse total.

Isso permite um mesmo cliente ter vários sites e preços diferentes por serviço.

## WordPress Maintenance Designer
O WordPress Client Control passa a oferecer três modelos:

1. **Institucional**
2. **Financeiro discreto**
3. **Manutenção premium**

Cada modelo pode ser editado no EXE PRO:
- nome;
- selo/eyebrow;
- título;
- subtítulo;
- mensagem;
- texto da barra de progresso;
- mostrar/ocultar barra;
- texto do botão;
- URL do botão;
- cor de destaque;
- fundo;
- cartão;
- cor do texto.

## Configuração por site
Cada WordPress conectado pode escolher:
- modelo;
- percentual de progresso;
- subtítulo específico opcional;
- mensagem específica opcional.

Assim, dois sites do mesmo cliente podem usar layouts e mensagens diferentes.

## EXE PRO Connector 1.1.0
O plugin WordPress foi atualizado com:
- suporte aos três modelos;
- barra de progresso;
- subtítulo;
- botão opcional;
- cores controladas pela Cloud;
- layout responsivo;
- visual premium;
- prévia do último modelo recebido no wp-admin.

A suspensão continua usando HTTP 503 + Retry-After.
Administradores logados continuam com acesso ao wp-admin.

## Segurança e compatibilidade
- nenhuma senha WordPress é armazenada no EXE PRO;
- HMAC SHA-256 continua obrigatório;
- nenhuma tabela existente é removida;
- `wordpress_sites` recebe apenas colunas aditivas de design;
- IDs e sincronização do CRM permanecem compatíveis;
- `clientServiceItems` é JSONB no payload do Cliente.

# EXE PRO Cloud 3.6.7 — WhatsApp Business + Telegram + Cobranças

## Objetivo
Permitir que clientes e contatos autorizados recebam alertas financeiros por WhatsApp Business Platform ou Telegram, com histórico, fila de envio e proteção contra duplicidade.

## Central de Notificações
- novo módulo **Notificações**;
- fila de avisos agendados, vencidos, enviados, falhos e cancelados;
- planejamento manual dos lembretes;
- envio manual individual ou em lote;
- envio automático opcional a cada 15 minutos;
- histórico por cliente/fatura/canal;
- deduplicação por fatura, canal, tipo e data.

## Régua de cobrança
Configurável pelo Super Admin:
- dias antes do vencimento;
- aviso no dia do vencimento;
- dias após o vencimento;
- confirmação de pagamento opcional;
- horário padrão de envio;
- envio automático ligado/desligado.

## WhatsApp Business Platform
- Access Token armazenado criptografado;
- Phone Number ID;
- Graph API version configurável;
- idioma do template;
- templates separados para pré-vencimento, vence hoje, atraso e pagamento confirmado;
- o EXE PRO envia somente mensagens de template pelo fluxo automático.

Os templates devem estar aprovados na conta WhatsApp Business correspondente. O modelo esperado usa 5 parâmetros no corpo:
1. nome do cliente;
2. descrição da cobrança;
3. data de vencimento;
4. valor;
5. chave PIX.

## Telegram Bot
- Bot Token armazenado criptografado;
- usuário do bot configurável;
- link individual no Cliente 360;
- o cliente precisa iniciar o bot uma vez;
- botão **Sincronizar Telegram** vincula o chat ao cadastro do cliente;
- envio usa o Bot API oficial.

## Consentimento
Nenhum contato recebe cobrança apenas por estar na prospecção.

No Cliente 360 existe a marcação:
- autoriza notificações de cobrança;
- receber por WhatsApp;
- receber por Telegram;
- data do consentimento;
- status de conexão do Telegram.

Sem autorização registrada, o motor cancela qualquer envio daquele contato.

## Financeiro
A régua lê os recebíveis já existentes do EXE PRO.
Cobranças pagas ou canceladas cancelam lembretes pendentes. Confirmação de pagamento é opcional.

## Banco
Foi adicionada a tabela `notification_outbox` para fila e histórico. Nenhuma tabela existente foi removida ou recriada.

## Segurança
Tokens ficam em `cloud_secrets` criptografados com `EXE_CLOUD_SECRET_KEY`.
A API key/token nunca é enviado ao navegador.

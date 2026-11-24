# EXE PRO Cloud 4.2.0 — WhatsApp Business Central de Conversas

## Objetivo

Adicionar uma Central de Conversas dentro do EXE PRO usando a WhatsApp Business Platform oficial da Meta, sem substituir nem quebrar o WhatsApp Web atual ou as notificações financeiras.

## Incluído

- Central interna para listar conversas, mensagens recebidas e mensagens enviadas.
- Webhook oficial com verificação por Verify Token e assinatura X-Hub-Signature-256.
- Histórico persistido no PostgreSQL com deduplicação pelo ID da mensagem da Meta.
- Identificação automática do Lead pelo telefone/WhatsApp já cadastrado.
- Status de envio e entrega recebidos pelos webhooks da Meta.
- Configuração protegida pelo Super Admin, com Access Token, App Secret e Verify Token criptografados.
- Fluxo financeiro existente preservado: cobranças continuam usando templates aprovados e consentimento registrado.
- WhatsApp Web 4.1.5 preservado como opção separada para o WhatsApp pessoal.

## Configuração pós-publicação

1. No Meta for Developers, configure o callback URL apontando para /api/whatsapp/webhook.
2. Use o mesmo Verify Token cadastrado no EXE PRO.
3. Informe o App Secret, Access Token, Phone Number ID e versão da Graph API no menu WhatsApp Business.
4. Inscreva o campo messages no webhook.
5. Faça um teste com uma mensagem recebida e uma resposta pela Central.

Mensagens livres seguem as regras da janela de atendimento da Meta. Fora dessa janela, use templates aprovados pela área de Notificações.
# EXE PRO Cloud 4.1.5 — WhatsApp Web

## Objetivo

Permitir que a Central de Conversas use o WhatsApp Web com o número que o usuário já utiliza, sem armazenar sessão, QR Code ou credenciais pessoais no servidor.

## Fluxo

- O usuário abre **Conversas** dentro do EXE PRO.
- O botão **Abrir WhatsApp Web** abre web.whatsapp.com.
- Se a sessão ainda não estiver conectada, o próprio WhatsApp Web apresenta o QR Code.
- Ao clicar em **WhatsApp** em um contato, o EXE PRO prepara o número e a mensagem e abre a conversa correspondente.
- O usuário revisa a conversa e confirma o envio no botão do próprio WhatsApp.
- O **Link alternativo** preserva o fluxo anterior baseado em wa.me.

## Compatibilidade e segurança

- Nenhuma tabela ou dado existente é removido.
- A sincronização Windows ↔ Cloud, o Portal, as notificações WhatsApp Business e os demais módulos permanecem preservados.
- Nenhum token, cookie ou sessão do WhatsApp é armazenado pelo EXE PRO.
- O envio não é automático: a confirmação final continua sendo feita pelo usuário no WhatsApp.
- A atualização usa cache PWA v4.1.5 para evitar servir a interface anterior.

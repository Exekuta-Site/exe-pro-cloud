# EXE PRO Cloud 4.3.0 — QR Code oficial do WhatsApp Business

## Objetivo

Adicionar ao EXE PRO uma conexão por QR Code usando o fluxo oficial da Meta para WhatsApp Business App Onboarding / Coexistence.

## Como funciona

- O Super Admin informa o Meta App ID e o Embedded Signup Config ID.
- O EXE PRO abre o Embedded Signup oficial da Meta.
- A Meta exibe o QR Code dentro do fluxo de conexão.
- O responsável lê o QR Code pelo aplicativo WhatsApp Business.
- O mesmo número pode continuar no aplicativo Business e ser atendido pela Central de Conversas do EXE PRO via Cloud API.

## Segurança

- O Access Token continua criptografado no cofre cloud_secrets.
- O App Secret nunca é enviado ao navegador.
- O estado temporário do onboarding é salvo como hash no PostgreSQL e expira em dez minutos.
- O fluxo exige autenticação de Super Admin e proteção CSRF.
- O WhatsApp Web pessoal permanece separado e não é substituído.

## Configuração da Meta

1. Criar/configurar o aplicativo Meta como Tech Provider.
2. Ativar o Embedded Signup para WhatsApp Business App Onboarding.
3. Solicitar as permissões e acessos exigidos pela Meta.
4. Copiar o App ID e o Config ID para o menu WhatsApp Business do EXE PRO.
5. Cadastrar o App Secret no campo protegido já existente.
6. Clicar em Conectar por QR Code oficial.
7. Ler o QR Code no WhatsApp Business e concluir a autorização.

A disponibilidade do fluxo depende da elegibilidade da conta, do aplicativo Meta e das permissões aprovadas. O EXE PRO não fabrica um QR Code próprio nem usa um cliente WhatsApp Web não oficial.

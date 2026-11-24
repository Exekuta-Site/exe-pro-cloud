=== EXE PRO Connector ===
Contributors: exekuta
Tags: crm, maintenance, billing, integration
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.4.0
License: Proprietary

Conector do EXE PRO para sites WordPress de clientes.

== Recursos ==

* Conexão por chave compartilhada, sem usuário/senha do WordPress.
* Assinatura HMAC SHA-256 com proteção contra replay.
* Status remoto.
* Suspensão temporária com HTTP 503 e Retry-After.
* Reativação remota.
* Bypass para administradores logados.
* Reativação de emergência pelo wp-admin.
* Pop-up independente de comunicados, configurável e ativável via EXEKUTA (HMAC) ou wp-admin.

== Instalação ==

1. Envie o ZIP em Plugins > Adicionar plugin > Enviar plugin.
2. Ative o EXE PRO Connector.
3. Acesse Configurações > EXE PRO Connector.
4. Copie a Chave de conexão.
5. No EXE PRO Cloud, abra Sites WordPress e conecte o cliente usando a URL HTTPS e essa chave.

== Observação ==

A suspensão remota deve ser usada somente quando houver autorização contratual aplicável. O plugin exibe uma página temporária com HTTP 503; não apaga conteúdo, banco de dados, tema ou plugins.

== 1.1.0 ==

* Três modelos visuais de suspensão.
* Barra de progresso configurável.
* Mensagem, subtítulo, cores e botão controlados pelo EXE PRO Cloud.
* Novo layout premium e financeiro discreto.

== 1.4.0 ==

* Módulo isolado de Pop-up, desativado por padrão.
* Rotas assinadas GET/POST /exe-pro/v1/popup.
* Configuração manual de segurança em Configurações > EXE PRO Pop-up.
* Preservadas rotas e opções legadas.

Consulte docs/INTEGRACAO-EXEKUTA-POPUP.md para integração.

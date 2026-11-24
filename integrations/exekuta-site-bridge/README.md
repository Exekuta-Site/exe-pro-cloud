# Ponte de leads do site para o EXE PRO

Esta ponte conecta o endpoint REST de leads que já existe no site EXEKUTA ao novo endpoint seguro do EXE PRO Cloud. O formulário continua respondendo normalmente no site; se o EXE PRO estiver indisponível, o erro é registrado no log do WordPress sem quebrar a experiência do visitante.

## Configuração no EXE PRO Cloud

Configure no ambiente do Cloudways:

EXE_CLOUD_SITE_LEAD_SECRET

Use um segredo longo e aleatório. O mesmo valor será usado no WordPress. Não coloque esse segredo em JavaScript, HTML, campos do formulário ou repositório público.

O endpoint da aplicação é:

https://app.exekuta.com.br/api/integrations/site-lead

## Instalação no WordPress

1. Copie o arquivo exekuta-site-bridge.php para:
   wp-content/plugins/exekuta-exe-pro-lead-bridge/exekuta-site-bridge.php
2. Antes da linha "That's all, stop editing!" no wp-config.php, adicione:

    define('EXEKUTA_EXE_PRO_LEAD_ENDPOINT', 'https://app.exekuta.com.br/api/integrations/site-lead');
    define('EXEKUTA_EXE_PRO_LEAD_SECRET', 'o-mesmo-segredo-configurado-no-cloudways');

3. Ative o plugin no painel do WordPress.
4. Envie um teste pelo formulário de contato do site e confira o módulo Leads do EXE PRO.

O plugin usa HMAC-SHA256, timestamp com janela de cinco minutos, identificador de evento e HTTPS. O EXE PRO também evita duplicidade quando o mesmo envio é repetido.

## Operação

O encaminhamento é feito no servidor WordPress, depois que o endpoint original aceita o lead. Nunca é feito diretamente pelo navegador do visitante. Falhas de comunicação aparecem no log do WordPress e não alteram a resposta original do formulário.

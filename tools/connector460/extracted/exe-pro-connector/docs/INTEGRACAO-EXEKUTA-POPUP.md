# EXE PRO Connector 1.4.0 — Integração do Pop-up com EXEKUTA

## Objetivo

Permitir que o backend do app EXEKUTA controle um aviso em formato de Pop-up no site WordPress associado à conexão existente, **sem alterar** a API anterior de status, suspensão e reativação.

Apenas o **backend** do EXEKUTA deve assinar e enviar as requisições HMAC. Nunca enviar a chave compartilhada ao React/JavaScript no navegador, nem gravá-la no repositório público.

## Novos endpoints (WordPress do cliente)

Todos exigem os mesmos cabeçalhos HMAC dos endpoints antigos:

- `GET https://SITE-DO-CLIENTE/wp-json/exe-pro/v1/popup`: consulta configurações;
- `POST https://SITE-DO-CLIENTE/wp-json/exe-pro/v1/popup`: altera configurações e ativa/desativa.

Não alteramos `GET /status`, `POST /suspend` ou `POST /resume`.

### Corpo de exemplo para ATIVAR

```json
{
  "enabled": true,
  "title": "Novidade especial",
  "message": "Conheça os serviços da nossa empresa!",
  "button_label": "Saiba mais",
  "button_url": "https://exemplo.com/novidade",
  "accent_color": "#18b7a4",
  "show_on": "all",
  "frequency": "session",
  "delay_seconds": 2
}
```

- `enabled`: booleano `true` ou `false`; padrão false na primeira instalação.
- `title`: até 180 caracteres; `message`: até 2.000; `button_label`: até 80.
- `button_url`: URL completa http/https, opcional. Sem URL, botão não aparece.
- `accent_color`: cor hexadecimal (#RGB ou #RRGGBB).
- `show_on`: `all` (todas as páginas) ou `home` (somente página inicial).
- `frequency`: `session` (uma vez por sessão), `daily` (uma vez por 24h), `always` (toda visita/página carregada).
- `delay_seconds`: inteiro de 0 até 30 segundos.
- Os campos podem ser enviados parcialmente: os não informados mantêm seus valores.
- O WordPress registra automaticamente `revision` e `updated_at`. Cada atualização gera uma nova revisão para que o visitante veja a nova campanha mesmo que tenha fechado a anterior.

### Corpo para DESATIVAR

```json
{ "enabled": false }
```

### Resposta bem-sucedida

```json
{
  "ok": true,
  "popup": {
    "enabled": 1,
    "title": "Novidade especial",
    "message": "Conheça os serviços da nossa empresa!",
    "button_label": "Saiba mais",
    "button_url": "https://exemplo.com/novidade",
    "accent_color": "#18b7a4",
    "show_on": "all",
    "frequency": "session",
    "delay_seconds": 2,
    "revision": "UUID-GERADO-PELO-WORDPRESS",
    "updated_at": "HORARIO-ISO8601"
  },
  "cache_cleared": ["wordpress-object-cache", "plugin-hook"]
}
```

A lista `cache_cleared` varia conforme os plugins instalados. O conteúdo do objeto `popup` é igual na consulta GET, sem a lista de limpeza de cache.

### Assinatura HMAC (mesma versão anterior)

Cabeçalhos enviados pelo backend:

- `X-EXE-Timestamp`: timestamp Unix atual, em segundos.
- `X-EXE-Nonce`: token alfanumérico (podem ser usados `_` e `-`) de 16–100 caracteres, **novo em cada requisição**.
- `X-EXE-Signature`: assinatura HMAC SHA-256 hexadecimal minúscula.
- `Content-Type: application/json` no POST.

Texto a assinar (separado por novas linhas `\n`, sem barra final no endpoint):

```text
TIMESTAMP
NONCE
POST
/exe-pro/v1/popup
SHA256_HEX_DOS_BYTES_EXATOS_DO_CORPO
```

O SHA-256 do `GET` usa corpo vazio. A chave HMAC é a chave compartilhada cadastrada na conexão existente, **não** um token WordPress.

Erro `403` se o WordPress estiver com “Permitir que o EXE PRO suspenda e reative este site” desligado: esse bloqueio também impede alterações remotas do Pop-up, mas a edição local pelo wp-admin segue disponível. `401` se assinatura inválida/expirada; `409` se nonce repetido; `400` se campos inválidos.

## Etapas para integrar no backend do app

1. Na tela de Sites WordPress, reutilizar o `site_url` e a chave **guardada no servidor** para aquele site.
2. Criar endpoint interno/autorizado no backend do EXEKUTA para consultar e atualizar o pop-up do site selecionado; validar que o usuário do EXEKUTA tem permissão para aquele site.
3. O backend recebe configurações, assina o corpo exato e faz o POST HTTPS na REST API WordPress.
4. A tela do EXEKUTA apresenta: ativo/inativo, título, mensagem, botão, URL, cor, localização, frequência, atraso; mostra a resposta do WordPress e erros reais.
5. Não chamar a rota WordPress diretamente do front-end do EXEKUTA para não vazar a chave e não criar problemas de CORS.

## Exemplo Node.js para o backend do EXEKUTA (Node 18+)

```js
import { createHash, createHmac, randomBytes } from 'node:crypto';

export async function configurarPopupWordPress(siteUrl, sharedSecret, popup) {
  const route = '/exe-pro/v1/popup';
  const method = 'POST';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(24).toString('base64url');
  const body = JSON.stringify(popup);
  const bodyHash = createHash('sha256').update(body, 'utf8').digest('hex');
  const canonical = [timestamp, nonce, method, route, bodyHash].join('\n');
  const signature = createHmac('sha256', sharedSecret).update(canonical, 'utf8').digest('hex');
  const site = new URL(siteUrl);
  if (site.protocol !== 'https:') throw new Error('O site conectado precisa usar HTTPS');
  const apiUrl = new URL('/wp-json' + route, site.origin);

  const response = await fetch(apiUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-EXE-Timestamp': timestamp,
      'X-EXE-Nonce': nonce,
      'X-EXE-Signature': signature,
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'WordPress recusou o comando');
  return result;
}
```

> Nota: o exemplo assume WordPress instalado na raiz do domínio. Em sites instalados em subdiretório, montar a URL REST a partir da URL correta do WordPress (a mesma usada pelo EXEKUTA hoje). Em produção, validar domínio/IP do site cadastrado para mitigar SSRF no backend e usar a autorização já existente.

## Observações de segurança/compatibilidade

- Opções legadas **não são modificadas**: o pop-up usa `exe_pro_connector_popup` em vez de `exe_pro_connector_settings`.
- A desativação do Pop-up não desativa o WordPress e não altera as suspensões atuais.
- Se o visitante usa bloqueio de armazenamento de sessão, a frequência pode não ser lembrada.
- O pop-up usa `wp_footer`; temas que não chamam `wp_footer()` precisam ser corrigidos.
- Cache de página e Cloudflare podem servir HTML anterior depois da ativação/desativação. O plugin executa a rotina legada de limpeza de cache WP/cache plugins; **CDN externo pode exigir purge ou regra de cache para páginas HTML**. Não prometer propagação imediata sem validar o cache.
- Antes de substituir em produção, manter backup do ZIP original, fazer backup do banco e testar em staging. A versão 1.4.0 mantém o slug da pasta `exe-pro-connector` para o WordPress reconhecer atualização, mas deve ser submetida a testes reais no ambiente do cliente.

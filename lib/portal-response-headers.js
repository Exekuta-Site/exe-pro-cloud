'use strict';

// Headers exclusivos para a resposta HTML direta do Portal do Cliente.
// Nao restringir script-src/default-src aqui: portal.html contem scripts inline
// legados. A protecao de iframe nao depende dessas diretivas.
function portalResponseHeaders(contentLength, requireHttps) {
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'content-length': contentLength,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
  };
  if (requireHttps) headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  return headers;
}

module.exports = { portalResponseHeaders };

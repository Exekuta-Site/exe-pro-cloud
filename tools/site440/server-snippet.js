const SITE440_MARKER = 'EXE_PRO_SITE_LEADS_440';
const SITE440_SECRET = String(process.env.EXE_CLOUD_SITE_LEAD_SECRET || '').trim();
const SITE440_MAX_BODY = 256 * 1024;
const SITE440_MAX_SKEW_MS = 5 * 60 * 1000;
const SITE440_RATE_WINDOW_MS = 10 * 60 * 1000;
const SITE440_RATE_LIMIT = 30;
const siteLead440Rate = new Map();

function siteLead440ReadRawBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let settled = false;
    const chunks = [];
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value);
    };
    req.on('data', chunk => {
      if (settled) return;
      total += chunk.length;
      if (total > SITE440_MAX_BODY) {
        req.resume();
        finish(Object.assign(new Error('Payload do site excede o limite permitido.'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks).toString('utf8')));
    req.on('error', error => finish(error));
  });
}

function siteLead440ExpectedSignature(timestamp, rawBody) {
  return 'sha256=' + crypto.createHmac('sha256', SITE440_SECRET)
    .update(String(timestamp) + '.' + String(rawBody), 'utf8')
    .digest('hex');
}

function siteLead440SignatureValid(req, rawBody) {
  if (!SITE440_SECRET) return false;
  const timestamp = String(req.headers['x-exekuta-timestamp'] || '').trim();
  const signature = String(req.headers['x-exekuta-signature'] || '').trim().toLowerCase();
  if (!/^[0-9]{10,13}$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/.test(signature)) return false;
  const numeric = Number(timestamp);
  const timestampMs = timestamp.length === 10 ? numeric * 1000 : numeric;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > SITE440_MAX_SKEW_MS) return false;
  return safeEq(signature, siteLead440ExpectedSignature(timestamp, rawBody).toLowerCase());
}

function siteLead440RateAllowed(key) {
  const now = Date.now();
  const current = siteLead440Rate.get(key);
  if (!current || now - current.startedAt >= SITE440_RATE_WINDOW_MS) {
    siteLead440Rate.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > SITE440_RATE_LIMIT) return false;
  }
  if (siteLead440Rate.size > 5000) {
    for (const [entryKey, entry] of siteLead440Rate) {
      if (now - entry.startedAt >= SITE440_RATE_WINDOW_MS) siteLead440Rate.delete(entryKey);
    }
  }
  return true;
}

function siteLead440Input(body, keys, max, label) {
  const candidates = Array.isArray(keys) ? keys : [keys];
  let raw = '';
  for (const key of candidates) {
    if (body[key] !== undefined && body[key] !== null) {
      raw = body[key];
      break;
    }
  }
  const value = String(raw || '').trim();
  if (value.length > max) return { ok: false, error: label + ' excede o limite permitido.' };
  return { ok: true, value };
}

function siteLead440Normalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Payload do site invalido.' };
  }
  const honeypot = String(body.honeypot || '').trim();
  if (honeypot) return { ok: false, error: 'Formulario invalido.' };
  const consent = body.consent === true || body.consent === 1 || body.consent === '1' || body.consent === 'true';
  if (!consent) return { ok: false, error: 'O consentimento e obrigatorio.' };

  const schema = [
    ['name', ['name'], 120, 'Nome'],
    ['email', ['email'], 180, 'E-mail'],
    ['whatsapp', ['whatsapp', 'phone'], 40, 'WhatsApp'],
    ['company', ['company', 'companyName'], 180, 'Empresa'],
    ['role', ['role'], 120, 'Cargo'],
    ['website', ['website'], 300, 'Site'],
    ['challenge', ['challenge'], 500, 'Desafio'],
    ['service', ['service'], 180, 'Servico'],
    ['investment', ['investment'], 120, 'Investimento'],
    ['message', ['message'], 4000, 'Mensagem'],
    ['sourcePage', ['sourcePage', 'source_page'], 300, 'Pagina de origem'],
    ['externalId', ['eventId', 'externalId'], 180, 'Identificador externo']
  ];
  const values = {};
  for (const [key, keys, max, label] of schema) {
    const field = siteLead440Input(body, keys, max, label);
    if (!field.ok) return field;
    values[key] = field.value;
  }

  values.name = values.name.replace(/\s+/g, ' ');
  values.email = values.email.toLowerCase();
  if (values.name.length < 2) return { ok: false, error: 'Informe seu nome.' };
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { ok: false, error: 'E-mail invalido.' };
  }
  const phoneDigits = values.whatsapp.replace(/\D/g, '');
  if (values.whatsapp && (phoneDigits.length < 10 || phoneDigits.length > 20)) {
    return { ok: false, error: 'WhatsApp invalido.' };
  }
  if (!values.email && !phoneDigits) {
    return { ok: false, error: 'Informe e-mail ou WhatsApp.' };
  }
  if (values.website) {
    try {
      const website = new URL(values.website);
      if (!['http:', 'https:'].includes(website.protocol)) throw new Error('protocol');
    } catch {
      return { ok: false, error: 'Site invalido.' };
    }
  }

  const utm = {};
  if (body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)) {
    for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
      const field = siteLead440Input(body.utm, key, 120, 'UTM ' + key);
      if (!field.ok) return field;
      if (field.value) utm[key] = field.value;
    }
  }
  return {
    ok: true,
    value: {
      ...values,
      phoneDigits,
      utm
    }
  };
}

function siteLead440Fingerprint(value) {
  const input = value || {};
  const externalId = String(input.externalId || '').trim();
  const canonical = externalId
    ? 'event:' + externalId
    : [
      'payload',
      String(input.email || '').toLowerCase(),
      String(input.phoneDigits || String(input.whatsapp || '').replace(/\D/g, '')),
      String(input.website || '').toLowerCase(),
      String(input.sourcePage || '').toLowerCase(),
      String(input.message || '').toLowerCase()
    ].join('|');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function siteLead440Handle(req) {
  if (!SITE440_SECRET) {
    return { status: 503, body: { ok: false, error: 'Integracao do site ainda nao foi configurada na Cloud.' } };
  }
  const rawBody = await siteLead440ReadRawBody(req);
  if (!siteLead440SignatureValid(req, rawBody)) {
    return { status: 401, body: { ok: false, error: 'Assinatura da integracao invalida ou expirada.' } };
  }
  let body;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return { status: 400, body: { ok: false, error: 'JSON invalido.' } };
  }
  const headerEventId = String(req.headers['x-exekuta-event-id'] || '').trim();
  if (headerEventId && !body.eventId && !body.externalId) {
    body = { ...body, eventId: headerEventId };
  }
  const normalized = siteLead440Normalize(body);
  if (!normalized.ok) return { status: 400, body: { ok: false, error: normalized.error } };
  const rateKey = clientIp(req) || 'unknown';
  if (!siteLead440RateAllowed(rateKey)) {
    return { status: 429, body: { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' } };
  }

  const value = normalized.value;
  const integrationKey = siteLead440Fingerprint(value);
  const result = await withTransaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [integrationKey]);
    const duplicate = await one(client, "SELECT entity_id FROM entities WHERE entity_type='lead' AND deleted=FALSE AND payload_json->>'integrationKey'=$1 LIMIT 1", [integrationKey]);
    if (duplicate) {
      return {
        status: 200,
        body: { ok: true, duplicate: true, leadId: duplicate.entity_id }
      };
    }

    const leadId = 'site-' + crypto.randomUUID();
    const now = nowIso();
    const note = [value.message, value.challenge].filter(Boolean).join('\n\n').slice(0, 4000);
    const payload = {
      id: leadId,
      leadId,
      name: value.name,
      companyName: value.company || value.name,
      companyContactName: value.name,
      companyContactRole: value.role,
      email: value.email,
      phone: value.whatsapp,
      whatsapp: value.whatsapp,
      website: value.website,
      service: value.service,
      clientServices: value.service,
      segment: value.service,
      investment: value.investment,
      challenge: value.challenge,
      message: value.message,
      notes: note,
      source: 'Site EXEKUTA',
      sourcePage: value.sourcePage,
      utm: value.utm,
      consent: true,
      consentAt: now,
      integration: 'exekuta-site',
      integrationKey,
      externalId: value.externalId,
      crmStatus: 'Novo',
      createdAt: now,
      createdBy: 'Site EXEKUTA',
      updatedAt: now,
      updatedBy: 'Site EXEKUTA'
    };
    await client.query(
      'INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',
      ['lead', leadId, 'site-exekuta', JSON.stringify(payload), now]
    );
    await client.query(
      'INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',
      ['lead', leadId, 'site-exekuta', JSON.stringify(payload), now]
    );
    return {
      status: 201,
      body: { ok: true, duplicate: false, leadId, cursor: await maxCursor(client) }
    };
  });
  await audit(result.body.duplicate ? 'site_lead_duplicate' : 'site_lead_created', 'site-exekuta', req, String(result.body.leadId || ''));
  return result;
}

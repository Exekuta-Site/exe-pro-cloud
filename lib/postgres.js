'use strict';

const { Pool } = require('pg');

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1','true','yes','on'].includes(String(raw).toLowerCase());
}

function buildPoolConfig() {
  const env = process.env;
  const first = (...keys) => { for (const k of keys) if (env[k]) return env[k]; return ''; };
  const suffix = (re) => { const k = Object.keys(env).find(x => re.test(x) && env[x]); return k ? env[k] : ''; };
  const url = first('DATABASE_URL','DB_URL','POSTGRES_URL','POSTGRESQL_URL') || suffix(/(?:DATABASE|POSTGRES(?:QL)?)_URL$/i);
  const sslRequired = boolEnv('EXE_CLOUD_DB_SSL', String(process.env.PGSSLMODE || '').toLowerCase() === 'require');
  const ssl = sslRequired ? { rejectUnauthorized: boolEnv('EXE_CLOUD_DB_SSL_VERIFY', true) } : false;
  if (url) return { connectionString: url, ssl, max: Number(process.env.EXE_CLOUD_DB_POOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 };

  const host = first('DB_HOST','PGHOST','POSTGRES_HOST','DATABASE_HOST') || suffix(/(?:DB|DATABASE|POSTGRES)_HOST$/i);
  const database = first('DB_NAME','PGDATABASE','POSTGRES_DB','POSTGRES_DATABASE','DATABASE_NAME') || suffix(/(?:DB_NAME|DATABASE_NAME|POSTGRES_DB)$/i);
  const user = first('DB_USER','PGUSER','POSTGRES_USER','DATABASE_USER') || suffix(/(?:DB_USER|DATABASE_USER|POSTGRES_USER)$/i);
  const password = first('DB_PASSWORD','PGPASSWORD','POSTGRES_PASSWORD','DATABASE_PASSWORD') || suffix(/(?:DB_PASSWORD|DATABASE_PASSWORD|POSTGRES_PASSWORD)$/i);
  const port = Number(first('DB_PORT','PGPORT','POSTGRES_PORT','DATABASE_PORT') || suffix(/(?:DB|DATABASE|POSTGRES)_PORT$/i) || 5432);
  if (!host || !database || !user) {
    throw new Error('PostgreSQL nao configurado. Defina DATABASE_URL ou DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
  }
  return { host, port, database, user, password, ssl, max: Number(process.env.EXE_CLOUD_DB_POOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 };
}

function createPool() {
  const pool = new Pool(buildPoolConfig());
  pool.on('error', err => console.error('PostgreSQL pool error:', err.message));
  return pool;
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { createPool, withTransaction, buildPoolConfig };

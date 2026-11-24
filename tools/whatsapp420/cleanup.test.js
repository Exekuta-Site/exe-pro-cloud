'use strict';

// Run: node --test tools/whatsapp420/cleanup.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'server-snippet.js'), 'utf8');

test('clears only failed messages for the selected conversation', async () => {
  const queries = [];
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.startsWith('DELETE FROM whatsapp_messages')) return { rowCount: 2 };
      return { rowCount: 1 };
    }
  };
  const context = vm.createContext({
    pool,
    validId: value => String(value || '').slice(0, 180),
    one: async (db, sql, params) => {
      assert.equal(db, pool);
      assert.match(sql, /SELECT conversation_id FROM whatsapp_conversations/);
      return params[0] === 'selected' ? { conversation_id: 'selected' } : null;
    },
    nowIso: () => '2026-10-02T00:00:00.000Z'
  });
  vm.runInContext(source, context, { filename: 'server-snippet.js' });

  const deleted = await context.whatsapp420ClearFailed({ conversationId: 'selected' });
  assert.equal(deleted, 2);

  const deleteQuery = queries.find(query => query.sql.startsWith('DELETE FROM whatsapp_messages'));
  assert.ok(deleteQuery);
  assert.match(deleteQuery.sql, /conversation_id=\$1/);
  assert.match(deleteQuery.sql, /LOWER\(status\)='failed'/);
  assert.deepEqual(Array.from(deleteQuery.params), ['selected']);
  assert.ok(queries.some(query => query.sql.startsWith('UPDATE whatsapp_conversations')));
});

test('rejects an empty or unknown conversation', async () => {
  const pool = { query: async () => ({ rowCount: 0 }) };
  const context = vm.createContext({
    pool,
    validId: value => String(value || '').slice(0, 180),
    one: async () => null,
    nowIso: () => '2026-10-02T00:00:00.000Z'
  });
  vm.runInContext(source, context, { filename: 'server-snippet.js' });

  await assert.rejects(
    () => context.whatsapp420ClearFailed({ conversationId: '' }),
    /Conversa não informada/
  );
  await assert.rejects(
    () => context.whatsapp420ClearFailed({ conversationId: 'missing' }),
    /Conversa não encontrada/
  );
});

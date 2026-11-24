'use strict';

// Run: node --test tools/whatsapp420/history.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'server-snippet.js'), 'utf8');
const conversation = { conversation_id: 'selected', phone_number: '5511999999999' };
const compare = (a, b) => a.created_at.localeCompare(b.created_at)
  || a.updated_at.localeCompare(b.updated_at);

function message(index, conversationId = 'selected') {
  const created = Date.UTC(2026, 0, 1) + Math.floor(index / 2) * 1000;
  return {
    message_id: `message-${index}`,
    conversation_id: conversationId,
    direction: index % 2 ? 'inbound' : 'outbound',
    message_type: 'text',
    body: `Message ${index}`,
    created_at: new Date(created).toISOString(),
    updated_at: new Date(created + index % 2).toISOString()
  };
}

async function view(messages, conversationId = 'selected') {
  const pool = {};
  const context = vm.createContext({
    pool,
    validId: value => value || '',
    getNotifyConfig: async () => ({}),
    getSecret: async () => '',
    PUBLIC_URL: '',
    rows: async (db, sql, params) => {
      assert.equal(db, pool);
      if (sql.includes('FROM whatsapp_conversations c')) return [conversation];
      // Simulate the actual ORDER BY and LIMIT instead of always returning
      // the desired window, so restoring ASC makes this regression fail.
      assert.match(sql, /FROM whatsapp_messages WHERE conversation_id=\$1/);
      const order = sql.match(/ORDER BY created_at (ASC|DESC),updated_at (ASC|DESC) LIMIT (\d+)/);
      assert.ok(order, 'history query must order and limit the selected conversation');
      assert.equal(order[1], order[2]);
      const direction = order[1] === 'ASC' ? 1 : -1;
      return messages.filter(row => row.conversation_id === params[0])
        .sort((a, b) => direction * compare(a, b)).slice(0, Number(order[3]));
    },
    one: async (db, sql, params) => {
      assert.equal(db, pool);
      if (sql.includes('WHERE conversation_id=$1')) {
        return params[0] === conversation.conversation_id ? conversation : null;
      }
      assert.match(sql, /SUM\(unread_count\)/);
      return { total: 0, conversations: 0 };
    }
  });
  vm.runInContext(source, context, { filename: 'server-snippet.js' });
  return context.whatsapp420View(new URL(`https://example.test/?conversationId=${conversationId}`));
}

test('initial history includes the latest 500 messages in chronological order', async () => {
  const history = Array.from({ length: 650 }, (_, index) => message(index));
  const result = await view([...history].reverse().concat(message(999, 'other')));
  const actual = Array.from(result.selected.messages);
  assert.equal(actual.length, 500);
  assert.deepEqual(actual.map(row => row.messageId), history.slice(150).map(row => row.message_id));
  assert.equal(actual.at(-1).messageId, 'message-649');
  assert.ok(actual.every(row => !history.slice(0, 150).some(old => old.message_id === row.messageId)));
  for (let i = 1; i < actual.length; i++) {
    assert.ok(compare(
      { created_at: actual[i - 1].createdAt, updated_at: actual[i - 1].updatedAt },
      { created_at: actual[i].createdAt, updated_at: actual[i].updatedAt }
    ) <= 0, 'rendered history must remain ascending by created_at, then updated_at');
  }
});

test('short and empty histories preserve chronological rendering', async () => {
  const history = Array.from({ length: 5 }, (_, index) => message(index));
  const result = await view([...history].reverse());
  assert.deepEqual(Array.from(result.selected.messages, row => row.messageId), history.map(row => row.message_id));
  assert.equal((await view([])).selected.messages.length, 0);
  assert.equal((await view(history, 'missing')).selected, null);
});

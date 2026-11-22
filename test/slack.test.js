const test = require('node:test');
const assert = require('node:assert');
const { postToSlack, notifyImportSuccess } = require('../services/slackService');

const realFetch = global.fetch;
test.afterEach(() => { global.fetch = realFetch; delete process.env.SLACK_WEBHOOK_URL; });

test('does nothing when SLACK_WEBHOOK_URL is not set', async () => {
  let called = false;
  global.fetch = async () => { called = true; };
  assert.strictEqual(await postToSlack('hi'), false);
  assert.strictEqual(called, false);
});

test('posts the message as JSON to the webhook', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T/B/X';
  let seen;
  global.fetch = async (url, opts) => { seen = { url, opts }; return { ok: true }; };
  assert.strictEqual(await postToSlack('hello'), true);
  assert.strictEqual(seen.url, 'https://hooks.slack.com/services/T/B/X');
  assert.strictEqual(seen.opts.method, 'POST');
  assert.deepStrictEqual(JSON.parse(seen.opts.body), { text: 'hello' });
});

test('refuses a non-https URL', async () => {
  process.env.SLACK_WEBHOOK_URL = 'http://example.com/hook';
  let called = false;
  global.fetch = async () => { called = true; };
  assert.strictEqual(await postToSlack('hi'), false);
  assert.strictEqual(called, false);
});

test('never throws: network errors and Slack errors only return false', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T/B/X';
  global.fetch = async () => { throw new Error('network down'); };
  assert.strictEqual(await postToSlack('hi'), false);
  global.fetch = async () => ({ ok: false, status: 404 });
  assert.strictEqual(await postToSlack('hi'), false);
});

test('import message names the file and the row counts, and escapes Slack markup', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T/B/X';
  let text;
  global.fetch = async (url, opts) => { text = JSON.parse(opts.body).text; return { ok: true }; };
  await notifyImportSuccess({ filename: 'ATP <!channel> & co.xlsx', rows: 24117, skipped: 3 });
  assert.match(text, /ATP &lt;!channel&gt; &amp; co\.xlsx/);
  assert.match(text, /24117 lignes importées, 3 ignorées/);
  assert.ok(!text.includes('<!channel>'));
  await notifyImportSuccess({ filename: 'a.csv', rows: 5 });
  assert.match(text, /5 lignes importées\)/);
});

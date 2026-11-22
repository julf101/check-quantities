const logger = require('../utils/logger');

const TIMEOUT_MS = 5000;

/**
 * Posts a short message to Slack when SLACK_WEBHOOK_URL is set (Heroku config var).
 * Never throws and never blocks an import: a Slack problem is only logged.
 */
async function postToSlack(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  if (!/^https:\/\//i.test(url)) {
    logger.warn('SLACK_WEBHOOK_URL is not an https URL; Slack message skipped');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) {
      logger.warn(`Slack answered ${res.status}; message not delivered`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn(`Could not reach Slack: ${err.message}`);
    return false;
  }
}

/** Slack control characters in a file name must not become formatting or mentions. */
const plain = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function notifyImportSuccess({ filename, rows, skipped = 0 }) {
  const detail = skipped ? `${rows} lignes importées, ${skipped} ignorées` : `${rows} lignes importées`;
  return postToSlack(`:package: Nouveau fichier ATP importé : *${plain(filename)}* (${detail})`);
}

module.exports = { postToSlack, notifyImportSuccess };

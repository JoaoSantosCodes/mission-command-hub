/**
 * Espelha entradas do feed Mission Agent para um canal Slack (Incoming Webhook).
 * @see https://api.slack.com/messaging/webhooks
 */
import { logger } from './logger.mjs';

const SLACK_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.SLACK_WEBHOOK_TIMEOUT_MS) || 8_000, 2_000),
  20_000
);

/** URL válida para Incoming Webhook clássico. */
export function isSlackIncomingWebhookUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'hooks.slack.com' &&
      u.pathname.startsWith('/services/')
    );
  } catch {
    return false;
  }
}

export function getSlackMirrorState() {
  const raw = String(process.env.SLACK_WEBHOOK_URL || '').trim();
  const webhookConfigured = raw.length > 0;
  const webhookFormatOk = isSlackIncomingWebhookUrl(raw);
  return {
    webhookConfigured,
    webhookFormatOk,
    /** Pronto para enviar mensagens (URL bem formada). */
    mirrorReady: webhookConfigured && webhookFormatOk,
  };
}

/**
 * @param {{ agent: string; action: string; type?: string; kind?: string }} entry
 */
export async function mirrorActivityToSlack(entry) {
  const url = String(process.env.SLACK_WEBHOOK_URL || '').trim();
  if (!isSlackIncomingWebhookUrl(url)) return;

  const agent = String(entry.agent ?? '').trim() || '@agent';
  const action = String(entry.action ?? '')
    .trim()
    .slice(0, 500);
  const kind = String(entry.kind ?? '').trim() || '—';
  const text = `*Architecture Agents Hub* · ${agent}\n${action}`;
  const payload = {
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${agent}* · \`${kind}\`\n${action}`,
        },
      },
    ],
  };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      logger.warn({ status: res.status, body: body.slice(0, 200) }, 'slack webhook mirror failed');
    }
  } catch (e) {
    logger.warn({ err: String(e?.message || e) }, 'slack webhook mirror error');
  } finally {
    clearTimeout(t);
  }
}

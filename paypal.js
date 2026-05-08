// paypal.js — minimal PayPal Subscriptions integration
// Uses the REST API directly (the official PayPal Node SDK has been deprecated).
// All credentials come from environment variables — never hardcode them.

const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const WEBHOOK_ID    = process.env.PAYPAL_WEBHOOK_ID    || '';

// Cache the OAuth token to avoid hitting /oauth2/token on every request.
let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment');
  }
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type':  'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
  return data.access_token;
}

// Look up a subscription by ID. Returns the full PayPal record so the caller
// can inspect status, plan_id, subscriber email, next billing time, etc.
async function getSubscription(subscriptionId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
  );
  if (!res.ok) {
    throw new Error(`PayPal getSubscription failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Cancel a subscription. PayPal returns 204 on success.
async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ reason })
    }
  );
  if (res.status !== 204) {
    throw new Error(`PayPal cancel failed: ${res.status} ${await res.text()}`);
  }
  return true;
}

// Verify a webhook event came from PayPal. This MUST be called for every
// incoming webhook before trusting its contents — otherwise anyone who
// knows your webhook URL could fake events and grant themselves premium.
async function verifyWebhookSignature(headers, rawBody) {
  if (!WEBHOOK_ID) {
    throw new Error('Missing PAYPAL_WEBHOOK_ID in environment');
  }
  const token = await getAccessToken();
  // Header names are case-insensitive; normalise to what PayPal expects.
  const h = (name) => headers[name] || headers[name.toLowerCase()] || '';
  const payload = {
    auth_algo:         h('paypal-auth-algo'),
    cert_url:          h('paypal-cert-url'),
    transmission_id:   h('paypal-transmission-id'),
    transmission_sig:  h('paypal-transmission-sig'),
    transmission_time: h('paypal-transmission-time'),
    webhook_id:        WEBHOOK_ID,
    webhook_event:     JSON.parse(rawBody.toString('utf8'))
  };
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return false;
  const result = await res.json();
  return result.verification_status === 'SUCCESS';
}

module.exports = {
  getAccessToken,
  getSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  PAYPAL_API
};

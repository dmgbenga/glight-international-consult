'use strict';

const crypto = require('node:crypto');
const { sendJson, logApiError } = require('../../lib/http');
const { supabaseRequest } = require('../../lib/supabase');

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || '';
  if (!secret || secret.length < 32 || !authorization.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = async function cleanupRateLimits(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET' });
  }
  if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const query = new URLSearchParams({ window_started_at: `lt.${cutoff}` });
  try {
    const response = await supabaseRequest(`/rest/v1/registration_rate_limits?${query.toString()}`, {
      method: 'DELETE',
      serviceRole: true,
      prefer: 'return=minimal'
    });
    if (!response.ok) throw new Error(`Rate-limit cleanup returned HTTP ${response.status}.`);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    logApiError('rate-limit-cleanup', error);
    return sendJson(res, 503, { error: 'Rate-limit cleanup could not be completed.' });
  }
};

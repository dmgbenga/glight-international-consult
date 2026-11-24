'use strict';

const {
  RequestError,
  sendJson,
  requireAllowedOrigin,
  readJsonBody,
  logApiError
} = require('../lib/http');
const { supabaseRequest, readResponseJson } = require('../lib/supabase');
const {
  validateRegistration,
  createRegistrationReference,
  createRateLimitKey
} = require('../lib/registration');

const REGISTRATION_ERROR = 'We could not submit this registration right now. Please try again later or contact Glight by phone or email.';

function getClientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim();
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',').pop().trim();
  }
  if (req.socket && typeof req.socket.remoteAddress === 'string') return req.socket.remoteAddress;
  return 'unknown';
}

async function consumeRateLimit(key) {
  const response = await supabaseRequest('/rest/v1/rpc/consume_registration_limit', {
    method: 'POST',
    serviceRole: true,
    body: { p_key_hash: key, p_limit: 5, p_window_seconds: 900 }
  });
  if (!response.ok) throw new Error(`Rate-limit storage returned HTTP ${response.status}.`);
  const result = await readResponseJson(response);
  if (typeof result !== 'boolean') throw new Error('Rate-limit storage returned an invalid response.');
  return result;
}

async function saveRegistration(data) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reference = createRegistrationReference();
    const response = await supabaseRequest('/rest/v1/student_registrations?select=reference', {
      method: 'POST',
      serviceRole: true,
      prefer: 'return=representation',
      body: {
        reference,
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        parent_phone: data.parentPhone,
        student_name: data.studentName,
        age: data.age,
        class_name: data.className,
        programme: data.programme,
        learning_mode: data.learningMode,
        guardian_consent: true,
        guardian_consent_name: data.parentName,
        guardian_consent_version: 'guardian-registration-v1'
      }
    });

    if (response.ok) {
      const saved = await readResponseJson(response);
      if (Array.isArray(saved) && saved[0] && typeof saved[0].reference === 'string') {
        return saved[0].reference;
      }
      throw new Error('Registration storage returned an invalid response.');
    }

    const result = await readResponseJson(response);
    if (result && result.code === '23505' && attempt < 2) continue;
    const error = new Error(`Registration storage returned HTTP ${response.status}.`);
    error.code = result && result.code ? result.code : undefined;
    throw error;
  }
  throw new Error('A unique registration reference could not be created.');
}

module.exports = async function register(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }

  try {
    requireAllowedOrigin(req);
    const payload = readJsonBody(req, 12 * 1024);
    const validation = validateRegistration(payload);
    if (!validation.valid) {
      return sendJson(res, 400, { error: 'Please check the highlighted fields.', fields: validation.fields });
    }

    const rateLimitKey = createRateLimitKey(getClientIp(req), process.env.RATE_LIMIT_SECRET);
    const permitted = await consumeRateLimit(rateLimitKey);
    if (!permitted) return sendJson(res, 429, { error: 'Too many registration attempts. Please wait and try again.' });

    const reference = await saveRegistration(validation.data);
    return sendJson(res, 201, { reference });
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message });
    logApiError('registration', error);
    return sendJson(res, 503, { error: REGISTRATION_ERROR });
  }
};

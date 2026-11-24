'use strict';

const {
  RequestError,
  sendJson,
  requireAllowedOrigin,
  readJsonBody,
  logApiError
} = require('../../lib/http');
const { supabaseRequest, readResponseJson } = require('../../lib/supabase');
const adminSession = require('./session');

const STATUSES = ['pending', 'contacted', 'registered', 'closed'];
const REGISTRATION_COLUMNS = [
  'id', 'reference', 'created_at', 'student_name', 'age', 'class_name',
  'programme', 'learning_mode', 'parent_name', 'parent_email', 'parent_phone',
  'guardian_consent', 'guardian_consent_name', 'guardian_consent_at',
  'guardian_consent_version', 'status'
].join(',');

async function requireAdministrator(req, res) {
  const session = await new Promise((resolve, reject) => {
    const response = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      end(body) {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (error) {
          reject(new Error('Administrator session returned an invalid response.'));
          return;
        }
        resolve({ status: this.statusCode, body: parsed, headers: this.headers });
      }
    };
    adminSession({
      method: 'GET',
      url: req.url,
      headers: req.headers,
      socket: req.socket
    }, response).catch(reject);
  });

  if (session.headers['Set-Cookie']) res.setHeader('Set-Cookie', session.headers['Set-Cookie']);
  if (session.status !== 200 || !session.body.authenticated) {
    throw new RequestError(401, 'Please sign in with an authorised administrator account.');
  }
  return session.body.user;
}

async function listRegistrations(req, res) {
  await requireAdministrator(req, res);
  const query = new URL(req.url, 'https://local.invalid').searchParams;
  const status = query.get('status') || '';
  if (status && !STATUSES.includes(status)) throw new RequestError(400, 'Select a valid registration status.');

  const limitValue = Number(query.get('limit') || 25);
  const offsetValue = Number(query.get('offset') || 0);
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100 ||
      !Number.isInteger(offsetValue) || offsetValue < 0 || offsetValue > 100000) {
    throw new RequestError(400, 'Select a valid registration page.');
  }

  const params = new URLSearchParams({ select: REGISTRATION_COLUMNS, order: 'created_at.desc' });
  params.set('limit', String(limitValue));
  if (status) params.set('status', `eq.${status}`);

  const response = await supabaseRequest(`/rest/v1/student_registrations?${params.toString()}`, {
    serviceRole: true,
    prefer: 'count=exact',
    range: `${offsetValue}-${offsetValue + limitValue - 1}`
  });
  if (!response.ok) throw new Error(`Registration list returned HTTP ${response.status}.`);

  const registrations = await readResponseJson(response);
  if (!Array.isArray(registrations)) throw new Error('Registration list returned an invalid response.');
  const contentRange = response.headers.get('content-range') || '';
  const totalMatch = contentRange.match(/\/(\d+|\*)$/);
  const total = totalMatch && totalMatch[1] !== '*' ? Number(totalMatch[1]) : registrations.length;
  return sendJson(res, 200, { registrations, total, offset: offsetValue, limit: limitValue });
}

async function updateRegistration(req, res) {
  await requireAdministrator(req, res);
  const query = new URL(req.url, 'https://local.invalid').searchParams;
  const id = query.get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new RequestError(400, 'Select a valid registration.');
  }

  const payload = readJsonBody(req, 2 * 1024);
  if (typeof payload.status !== 'string' || !STATUSES.includes(payload.status)) {
    throw new RequestError(400, 'Select a valid registration status.');
  }

  const params = new URLSearchParams({ id: `eq.${id}`, select: 'id,reference,status,updated_at' });
  const response = await supabaseRequest(`/rest/v1/student_registrations?${params.toString()}`, {
    method: 'PATCH',
    serviceRole: true,
    prefer: 'return=representation',
    body: { status: payload.status, updated_at: new Date().toISOString() }
  });
  if (!response.ok) throw new Error(`Registration update returned HTTP ${response.status}.`);
  const updated = await readResponseJson(response);
  if (!Array.isArray(updated) || updated.length !== 1) throw new RequestError(404, 'Registration was not found.');
  return sendJson(res, 200, { registration: updated[0] });
}

module.exports = async function registrations(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, PATCH' });
  }
  try {
    requireAllowedOrigin(req, { allowMissingOrigin: req.method === 'GET' });
    if (req.method === 'GET') return await listRegistrations(req, res);
    return await updateRegistration(req, res);
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message });
    logApiError('admin-registrations', error);
    return sendJson(res, 503, { error: 'Registrations could not be loaded or updated right now. Please try again.' });
  }
};

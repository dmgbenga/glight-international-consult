'use strict';

const {
  RequestError,
  sendJson,
  requireAllowedOrigin,
  readJsonBody,
  logApiError
} = require('../../lib/http');
const { supabaseRequest, readResponseJson } = require('../../lib/supabase');
const { PROGRAMMES } = require('../../lib/registration');
const adminSession = require('./session');

const STATUSES = ['Pending', 'Contacted', 'Approved', 'Rejected'];
const LEARNING_MODES = ['Physical', 'Online'];
const REGISTRATION_COLUMNS = [
  'id', 'reference', 'created_at', 'student_name', 'student_age', 'student_class',
  'additional_information', 'programme', 'learning_mode', 'parent_name', 'parent_email',
  'parent_phone', 'parental_consent', 'guardian_consent_name', 'guardian_consent_at',
  'guardian_consent_version', 'application_status'
].join(',');
const CSV_COLUMNS = [
  ['Reference', 'reference'],
  ['Received at', 'created_at'],
  ['Parent name', 'parent_name'],
  ['Parent email', 'parent_email'],
  ['Parent phone', 'parent_phone'],
  ['Student name', 'student_name'],
  ['Student age', 'student_age'],
  ['Student class', 'student_class'],
  ['Programme', 'programme'],
  ['Learning mode', 'learning_mode'],
  ['Additional information', 'additional_information'],
  ['Parental consent', 'parental_consent'],
  ['Application status', 'application_status']
];

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

function parseFilters(query) {
  const filters = {
    status: query.get('status') || '',
    programme: query.get('programme') || '',
    learningMode: query.get('learningMode') || '',
    search: (query.get('search') || '').trim()
  };
  if (filters.status && !STATUSES.includes(filters.status)) {
    throw new RequestError(400, 'Select a valid application status.');
  }
  if (filters.programme && !PROGRAMMES.includes(filters.programme)) {
    throw new RequestError(400, 'Select a valid programme.');
  }
  if (filters.learningMode && !LEARNING_MODES.includes(filters.learningMode)) {
    throw new RequestError(400, 'Select a valid learning mode.');
  }
  if (filters.search.length > 80 || (filters.search && !/^[\p{L}\p{M}\d .'-]+$/u.test(filters.search))) {
    throw new RequestError(400, 'Search names using letters, numbers, spaces, apostrophes, periods or hyphens.');
  }
  return filters;
}

function buildFilterParams(filters, select, order) {
  const params = new URLSearchParams({ select, order: order || 'created_at.desc' });
  if (filters.status) params.set('application_status', `eq.${filters.status}`);
  if (filters.programme) params.set('programme', `eq.${filters.programme}`);
  if (filters.learningMode) params.set('learning_mode', `eq.${filters.learningMode}`);
  if (filters.search) {
    params.set('or', `(student_name.ilike.*${filters.search}*,parent_name.ilike.*${filters.search}*)`);
  }
  return params;
}

function getTotalFromResponse(response, fallback) {
  const contentRange = response.headers.get('content-range') || '';
  const match = contentRange.match(/\/(\d+|\*)$/);
  return match && match[1] !== '*' ? Number(match[1]) : fallback;
}

async function queryRegistrations(filters, offset, limit, columns) {
  const params = buildFilterParams(filters, columns || REGISTRATION_COLUMNS);
  params.set('limit', String(limit));
  const response = await supabaseRequest(`/rest/v1/student_registrations?${params.toString()}`, {
    serviceRole: true,
    prefer: 'count=exact',
    range: `${offset}-${offset + limit - 1}`
  });
  if (!response.ok) throw new Error(`Registration query returned HTTP ${response.status}.`);
  const registrations = await readResponseJson(response);
  if (!Array.isArray(registrations)) throw new Error('Registration query returned an invalid response.');
  return { registrations, total: getTotalFromResponse(response, registrations.length) };
}

async function countRegistrations(status) {
  const filters = { status: status || '', programme: '', learningMode: '', search: '' };
  const result = await queryRegistrations(filters, 0, 1, 'id');
  return result.total;
}

async function listRegistrations(req, res, query) {
  const filters = parseFilters(query);
  const limitValue = Number(query.get('limit') || 25);
  const offsetValue = Number(query.get('offset') || 0);
  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100 ||
      !Number.isInteger(offsetValue) || offsetValue < 0 || offsetValue > 100000) {
    throw new RequestError(400, 'Select a valid registration page.');
  }

  const [page, total, pendingApplications] = await Promise.all([
    queryRegistrations(filters, offsetValue, limitValue),
    countRegistrations(),
    countRegistrations('Pending')
  ]);
  return sendJson(res, 200, {
    registrations: page.registrations,
    total: page.total,
    offset: offsetValue,
    limit: limitValue,
    summary: { totalRegistrations: total, pendingApplications }
  });
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportRegistrations(res, filters) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await queryRegistrations(filters, offset, pageSize);
    rows.push(...page.registrations);
    if (page.registrations.length < pageSize || rows.length >= page.total) break;
  }
  const lines = [
    CSV_COLUMNS.map(([label]) => csvCell(label)).join(','),
    ...rows.map((registration) => CSV_COLUMNS.map(([, key]) => {
      if (key === 'parental_consent') return csvCell(registration[key] ? 'Yes' : 'No');
      return csvCell(registration[key]);
    }).join(','))
  ];
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="glight-registrations-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(lines.join('\r\n'));
}

async function updateRegistration(req, res) {
  const query = new URL(req.url, 'https://local.invalid').searchParams;
  const id = query.get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new RequestError(400, 'Select a valid registration.');
  }

  const payload = readJsonBody(req, 2 * 1024);
  if (typeof payload.status !== 'string' || !STATUSES.includes(payload.status)) {
    throw new RequestError(400, 'Select a valid application status.');
  }

  const params = new URLSearchParams({ id: `eq.${id}`, select: 'id,reference,application_status,updated_at' });
  const response = await supabaseRequest(`/rest/v1/student_registrations?${params.toString()}`, {
    method: 'PATCH',
    serviceRole: true,
    prefer: 'return=representation',
    body: { application_status: payload.status, updated_at: new Date().toISOString() }
  });
  if (!response.ok) throw new Error(`Registration update returned HTTP ${response.status}.`);
  const updated = await readResponseJson(response);
  if (!Array.isArray(updated) || updated.length !== 1) throw new RequestError(404, 'Registration was not found.');
  return sendJson(res, 200, { registration: updated[0] });
}

async function deleteRegistration(req, res) {
  const query = new URL(req.url, 'https://local.invalid').searchParams;
  const id = query.get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new RequestError(400, 'Select a valid registration.');
  }

  const params = new URLSearchParams({ id: `eq.${id}`, select: 'id,reference' });
  const response = await supabaseRequest(`/rest/v1/student_registrations?${params.toString()}`, {
    method: 'DELETE',
    serviceRole: true,
    prefer: 'return=representation'
  });
  if (!response.ok) throw new Error(`Registration deletion returned HTTP ${response.status}.`);
  const deleted = await readResponseJson(response);
  if (!Array.isArray(deleted) || deleted.length !== 1) throw new RequestError(404, 'Registration was not found.');
  return sendJson(res, 200, { deleted: true, reference: deleted[0].reference });
}

module.exports = async function registrations(req, res) {
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, PATCH, DELETE' });
  }
  try {
    requireAllowedOrigin(req, { allowMissingOrigin: req.method === 'GET' });
    await requireAdministrator(req, res);
    if (req.method === 'GET') {
      const query = new URL(req.url, 'https://local.invalid').searchParams;
      if (query.get('format') === 'csv') return await exportRegistrations(res, parseFilters(query));
      if (query.has('format')) throw new RequestError(400, 'Select a valid export format.');
      return await listRegistrations(req, res, query);
    }
    if (req.method === 'PATCH') return await updateRegistration(req, res);
    return await deleteRegistration(req, res);
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message });
    logApiError('admin-registrations', error);
    return sendJson(res, 503, { error: 'Registrations could not be loaded or updated right now. Please try again.' });
  }
};

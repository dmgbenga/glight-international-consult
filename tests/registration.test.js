'use strict';

const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const test = require('node:test');
const register = require('../api/register');
const adminSession = require('../api/admin/session');
const registrations = require('../api/admin/registrations');
const { sendRegistrationNotifications } = require('../lib/email');
const {
  validateRegistration,
  createRegistrationReference,
  createRateLimitKey
} = require('../lib/registration');

const validPayload = {
  parentName: 'Ada Okafor',
  parentEmail: 'parent@example.com',
  parentPhone: '+234 801 234 5678',
  studentName: 'Tobi Okafor',
  age: 11,
  className: 'Primary 6',
  additionalInformation: 'Please contact me after 3 pm.',
  programme: 'Scratch Programming',
  learningMode: 'online',
  guardianConsent: true,
  website: ''
};

const googleTestPrivateKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
}).privateKey;

function withEnvironment(values, callback) {
  const previous = {};
  Object.keys(values).forEach((key) => {
    previous[key] = process.env[key];
    if (values[key] === null) delete process.env[key];
    else process.env[key] = values[key];
  });
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Object.keys(values).forEach((key) => {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      });
    });
}

function mockResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) }
  });
}

function invoke(handler, request) {
  return new Promise((resolve) => {
    const response = {
      headers: {},
      statusCode: 0,
      setHeader(name, value) { this.headers[name] = value; },
      end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); }
    };
    handler(request, response);
  });
}

function invokeRaw(handler, request) {
  return new Promise((resolve) => {
    const response = {
      headers: {},
      statusCode: 0,
      setHeader(name, value) { this.headers[name] = value; },
      end(body) { resolve({ status: this.statusCode, headers: this.headers, body }); }
    };
    handler(request, response);
  });
}

test('validates guardian consent, ages 3–18, delivery mode, and listed programme', () => {
  assert.equal(validateRegistration(validPayload).valid, true);
  assert.equal(validateRegistration({ ...validPayload, guardianConsent: false }).fields.guardianConsent !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, age: 3 }).valid, true);
  assert.equal(validateRegistration({ ...validPayload, age: 2 }).fields.age !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, age: 19 }).fields.age !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, learningMode: 'hybrid' }).fields.learningMode !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, programme: 'Unlisted programme' }).fields.programme !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, programme: 'STEM Education' }).fields.programme !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, additionalInformation: 'x'.repeat(1001) }).fields.additionalInformation !== undefined, true);
});

test('normalizes guardian email without altering student details', () => {
  const result = validateRegistration({ ...validPayload, parentEmail: '  PARENT@EXAMPLE.COM  ' });
  assert.equal(result.valid, true);
  assert.equal(result.data.parentEmail, 'parent@example.com');
  assert.equal(result.data.studentName, validPayload.studentName);
});

test('creates a date-based registration reference using random bytes', () => {
  const reference = createRegistrationReference(new Date('2026-11-24T12:00:00Z'), Buffer.from('abcdef'));
  assert.equal(reference, 'GL-2026-616263646566');
});

test('creates a fixed-length keyed rate-limit digest without including the IP in the digest', () => {
  const digest = createRateLimitKey('203.0.113.7', 'x'.repeat(32));
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(digest.includes('203.0.113.7'), false);
  assert.throws(() => createRateLimitKey('203.0.113.7', 'short'), /at least 32 characters/);
});

test('registration API stores validated data server-side and returns only its reference', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32),
    RESEND_API_KEY: null,
    EMAIL_FROM: null,
    REGISTRATION_NOTIFICATION_EMAIL: null,
    GOOGLE_SHEETS_SPREADSHEET_ID: null,
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: null,
    GOOGLE_SHEETS_PRIVATE_KEY: null
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (String(url).includes('consume_registration_limit')) return mockResponse(true);
      if (String(url).includes('student_registrations')) {
        const inserted = JSON.parse(options.body);
        assert.equal(inserted.parental_consent, true);
        assert.equal(inserted.parent_email, validPayload.parentEmail);
        assert.equal(inserted.student_age, validPayload.age);
        assert.equal(inserted.student_class, validPayload.className);
        assert.equal(inserted.additional_information, validPayload.additionalInformation);
        assert.equal(inserted.learning_mode, 'Online');
        assert.equal(inserted.application_status, 'Pending');
        return mockResponse([{ reference: inserted.reference }], 201);
      }
      throw new Error('Unexpected Supabase request.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.7'
        },
        body: validPayload
      });
      assert.equal(response.status, 201);
      assert.match(response.body.reference, /^GL-\d{4}-[A-F0-9]{12}$/);
      assert.deepEqual(Object.keys(response.body), ['reference', 'emailStatus', 'sheetStatus']);
      assert.equal(response.body.emailStatus, 'not_configured');
      assert.equal(response.body.sheetStatus, 'not_configured');
      assert.equal(calls.length, 2);
      assert.equal(calls[1].options.headers.apikey, 'test-service-role-key');
      assert.equal(calls[1].options.headers.Authorization, undefined);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration API sends parent confirmation and Glight alert through server-side email', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    SUPABASE_SECRET_KEY: 'test-secret-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32),
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'Glight <verified@example.com>',
    REGISTRATION_NOTIFICATION_EMAIL: 'team@example.com',
    GOOGLE_SHEETS_SPREADSHEET_ID: null,
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: null,
    GOOGLE_SHEETS_PRIVATE_KEY: null
  }, async () => {
    const originalFetch = global.fetch;
    const emailRequests = [];
    const supabaseRequests = [];
    global.fetch = async (url, options) => {
      if (String(url).includes('consume_registration_limit')) {
        supabaseRequests.push(options);
        return mockResponse(true);
      }
      if (String(url).includes('student_registrations')) {
        supabaseRequests.push(options);
        const inserted = JSON.parse(options.body);
        return mockResponse([{ reference: inserted.reference }], 201);
      }
      if (String(url) === 'https://api.resend.com/emails') {
        emailRequests.push({ headers: options.headers, body: JSON.parse(options.body) });
        return mockResponse({ id: `email-${emailRequests.length}` });
      }
      throw new Error('Unexpected request.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.9'
        },
        body: validPayload
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.emailStatus, 'sent');
      assert.equal(emailRequests.length, 2);
      assert.equal(supabaseRequests.length, 2);
      supabaseRequests.forEach((request) => {
        assert.equal(request.headers.apikey, 'test-secret-key');
        assert.equal(request.headers.Authorization, undefined);
      });
      assert.equal(emailRequests[0].headers.Authorization, 'Bearer test-resend-key');
      assert.deepEqual(emailRequests[0].body.to, [validPayload.parentEmail]);
      assert.match(emailRequests[0].body.text, /GL-\d{4}-[A-F0-9]{12}/);
      assert.deepEqual(emailRequests[1].body.to, ['team@example.com']);
      assert.doesNotMatch(emailRequests[1].body.text, /Tobi Okafor|parent@example.com/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration appends validated details to Google Sheets with RAW values', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32),
    RESEND_API_KEY: null,
    EMAIL_FROM: null,
    REGISTRATION_NOTIFICATION_EMAIL: null,
    GOOGLE_SHEETS_SPREADSHEET_ID: 'sheet_id-123',
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: 'registrations@example.iam.gserviceaccount.com',
    GOOGLE_SHEETS_PRIVATE_KEY: googleTestPrivateKey,
    GOOGLE_SHEETS_RANGE: 'Registrations!A:M'
  }, async () => {
    const originalFetch = global.fetch;
    let saved = 0;
    let appendedRow;
    const submittedPayload = {
      ...validPayload,
      additionalInformation: '=HYPERLINK("https://example.com","view")'
    };
    global.fetch = async (url, options) => {
      const requestUrl = String(url);
      if (requestUrl.includes('consume_registration_limit')) return mockResponse(true);
      if (requestUrl.includes('student_registrations')) {
        saved += 1;
        const inserted = JSON.parse(options.body);
        return mockResponse([{ reference: inserted.reference }], 201);
      }
      if (requestUrl === 'https://oauth2.googleapis.com/token') {
        const form = new URLSearchParams(options.body);
        assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        assert.match(form.get('assertion'), /^[A-Za-z0-9._-]+$/);
        return mockResponse({ access_token: 'test-google-access-token' });
      }
      if (requestUrl.startsWith('https://sheets.googleapis.com/')) {
        const parsedUrl = new URL(requestUrl);
        assert.equal(parsedUrl.searchParams.get('valueInputOption'), 'RAW');
        assert.equal(parsedUrl.searchParams.get('insertDataOption'), 'INSERT_ROWS');
        assert.equal(options.headers.Authorization, 'Bearer test-google-access-token');
        appendedRow = JSON.parse(options.body).values[0];
        return mockResponse({ updates: { updatedRows: 1 } });
      }
      throw new Error('Unexpected request.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.11'
        },
        body: submittedPayload
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.sheetStatus, 'appended');
      assert.equal(response.body.emailStatus, 'not_configured');
      assert.equal(saved, 1);
      assert.match(appendedRow[0], /^GL-\d{4}-[A-F0-9]{12}$/);
      assert.ok(Number.isFinite(Date.parse(appendedRow[1])));
      assert.deepEqual(appendedRow.slice(2), [
        validPayload.parentName,
        validPayload.parentEmail,
        validPayload.parentPhone,
        validPayload.studentName,
        validPayload.age,
        validPayload.className,
        validPayload.programme,
        'Online',
        submittedPayload.additionalInformation,
        'Yes',
        'Pending'
      ]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration remains saved when Google Sheets is unavailable', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32),
    RESEND_API_KEY: null,
    EMAIL_FROM: null,
    REGISTRATION_NOTIFICATION_EMAIL: null,
    GOOGLE_SHEETS_SPREADSHEET_ID: 'sheet_id-123',
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: 'registrations@example.iam.gserviceaccount.com',
    GOOGLE_SHEETS_PRIVATE_KEY: googleTestPrivateKey,
    GOOGLE_SHEETS_RANGE: 'Registrations!A:M'
  }, async () => {
    const originalFetch = global.fetch;
    let saved = 0;
    global.fetch = async (url, options) => {
      const requestUrl = String(url);
      if (requestUrl.includes('consume_registration_limit')) return mockResponse(true);
      if (requestUrl.includes('student_registrations')) {
        saved += 1;
        const inserted = JSON.parse(options.body);
        return mockResponse([{ reference: inserted.reference }], 201);
      }
      if (requestUrl === 'https://oauth2.googleapis.com/token') {
        return mockResponse({ access_token: 'test-google-access-token' });
      }
      if (requestUrl.startsWith('https://sheets.googleapis.com/')) return mockResponse({}, 503);
      throw new Error('Unexpected request.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.12'
        },
        body: validPayload
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.sheetStatus, 'failed');
      assert.equal(saved, 1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration remains successful when email delivery fails after saving', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32),
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'Glight <verified@example.com>',
    REGISTRATION_NOTIFICATION_EMAIL: 'team@example.com',
    GOOGLE_SHEETS_SPREADSHEET_ID: null,
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: null,
    GOOGLE_SHEETS_PRIVATE_KEY: null
  }, async () => {
    const originalFetch = global.fetch;
    let saved = 0;
    let emailAttempts = 0;
    global.fetch = async (url, options) => {
      if (String(url).includes('consume_registration_limit')) return mockResponse(true);
      if (String(url).includes('student_registrations')) {
        saved += 1;
        const inserted = JSON.parse(options.body);
        return mockResponse([{ reference: inserted.reference }], 201);
      }
      if (String(url) === 'https://api.resend.com/emails') {
        emailAttempts += 1;
        return mockResponse({ message: 'provider unavailable' }, 503);
      }
      throw new Error('Unexpected request.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.10'
        },
        body: validPayload
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.emailStatus, 'failed');
      assert.equal(saved, 1);
      assert.equal(emailAttempts, 2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration API rejects invalid submissions before contacting Supabase', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32)
  }, async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('Supabase must not be called for invalid form data.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: { ...validPayload, guardianConsent: false }
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.fields.guardianConsent, 'Parent or guardian consent is required.');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration API rejects oversized parsed bodies before contacting Supabase', async () => {
  await withEnvironment({ NODE_ENV: 'test' }, async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('Supabase must not be called for oversized form data.');
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: { ...validPayload, extra: 'x'.repeat(13 * 1024) }
      });
      assert.equal(response.status, 413);
      assert.match(response.body.error, /too large/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('registration API stops requests when the persistent rate limit is exceeded', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    RATE_LIMIT_SECRET: 'r'.repeat(32)
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      return mockResponse(false);
    };
    try {
      const response = await invoke(register, {
        method: 'POST',
        url: '/api/register',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-real-ip': '203.0.113.8'
        },
        body: validPayload
      });
      assert.equal(response.status, 429);
      assert.equal(calls.length, 1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('administrator sign-in sets protected cookies but never returns authentication tokens', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: 'https://glight-international-consult.vercel.app',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    SUPABASE_SECRET_KEY: 'test-secret-key'
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/auth/v1/token')) {
        return mockResponse({ access_token: 'access-token', refresh_token: 'refresh-token' });
      }
      if (String(url).includes('/auth/v1/user')) {
        return mockResponse({ email: 'admin@example.com', app_metadata: { role: 'admin' } });
      }
      throw new Error('Unexpected Supabase request.');
    };
    try {
      const response = await invoke(adminSession, {
        method: 'POST',
        url: '/api/admin/session',
        headers: {
          origin: 'https://glight-international-consult.vercel.app',
          'content-type': 'application/json'
        },
        body: { action: 'login', email: 'admin@example.com', password: 'test-password' }
      });
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, {
        authenticated: true,
        user: { email: 'admin@example.com' }
      });
      assert.equal(response.headers['Set-Cookie'].length, 2);
      assert.match(response.headers['Set-Cookie'][0], /HttpOnly; SameSite=Strict; Path=\/api; Secure/);
      assert.match(response.headers['Set-Cookie'][1], /HttpOnly; SameSite=Strict; Path=\/api; Secure/);
      assert.equal(JSON.stringify(response.body).includes('access-token'), false);
      assert.equal(calls[0].options.headers.apikey, 'test-publishable-key');
      assert.equal(calls[0].options.headers.Authorization, undefined);
      assert.equal(calls[1].options.headers.Authorization, 'Bearer access-token');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('administrator dashboard rejects unauthenticated access before reading registrations', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      return mockResponse({ message: 'invalid token' }, 401);
    };
    try {
      const response = await invoke(registrations, {
        method: 'GET',
        url: '/api/admin/registrations?limit=25&offset=0',
        headers: {
          origin: 'http://localhost:3000',
          'sec-fetch-site': 'same-origin',
          cookie: 'glight_admin_access=expired-token'
        }
      });
      assert.equal(response.status, 401);
      assert.match(response.body.error, /authorised administrator/);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].includes('student_registrations'), false);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('administrator can retrieve a paginated registration list after role verification', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/auth/v1/user')) {
        return mockResponse({ email: 'admin@example.com', app_metadata: { role: 'admin' } });
      }
      if (String(url).includes('/rest/v1/student_registrations')) {
        const requestUrl = new URL(String(url));
        if (requestUrl.searchParams.get('select') === 'id') {
          const count = requestUrl.searchParams.get('application_status') === 'eq.Pending' ? 5 : 30;
          return mockResponse([{ id: '00000000-0000-4000-8000-000000000001' }], 200, {
            'Content-Range': `0-0/${count}`
          });
        }
        return mockResponse([{
          id: '00000000-0000-4000-8000-000000000001',
          reference: 'GL-2026-ABCDEF012345',
          student_name: 'Tobi Okafor',
          student_age: 11,
          student_class: 'Primary 6',
          additional_information: 'Please call after 3 pm.',
          parent_name: 'Ada Okafor',
          parent_email: 'parent@example.com',
          parent_phone: '+2348012345678',
          parental_consent: true,
          programme: 'Scratch Programming',
          learning_mode: 'Online',
          application_status: 'Pending'
        }], 200, { 'Content-Range': '25-25/30' });
      }
      throw new Error('Unexpected Supabase request.');
    };
    try {
      const response = await invoke(registrations, {
        method: 'GET',
        url: '/api/admin/registrations?limit=25&offset=25&search=Tobi&programme=Scratch%20Programming&learningMode=Online',
        headers: {
          origin: 'http://localhost:3000',
          'sec-fetch-site': 'same-origin',
          cookie: 'glight_admin_access=valid-admin-token'
        }
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.total, 30);
      assert.equal(response.body.offset, 25);
      assert.equal(response.body.registrations[0].reference, 'GL-2026-ABCDEF012345');
      assert.deepEqual(response.body.summary, { totalRegistrations: 30, pendingApplications: 5 });
      assert.equal(calls.length, 4);
      assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-admin-token');
      assert.equal(calls[1].options.headers.apikey, 'test-service-role-key');
      assert.equal(calls[1].options.headers.Authorization, undefined);
      assert.equal(calls[1].options.headers.Range, '25-49');
      const listUrl = new URL(calls[1].url);
      assert.equal(listUrl.searchParams.get('programme'), 'eq.Scratch Programming');
      assert.equal(listUrl.searchParams.get('learning_mode'), 'eq.Online');
      assert.equal(listUrl.searchParams.get('or'), '(student_name.ilike.*Tobi*,parent_name.ilike.*Tobi*)');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('administrator can update status and delete a registration', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }, async () => {
    const originalFetch = global.fetch;
    const requests = [];
    global.fetch = async (url, options) => {
      const requestUrl = String(url);
      requests.push({ url: requestUrl, options });
      if (requestUrl.includes('/auth/v1/user')) {
        return mockResponse({ email: 'admin@example.com', app_metadata: { role: 'admin' } });
      }
      if (requestUrl.includes('/rest/v1/student_registrations') && options.method === 'PATCH') {
        const patchBody = JSON.parse(options.body);
        assert.equal(patchBody.application_status, 'Approved');
        assert.ok(Number.isFinite(Date.parse(patchBody.updated_at)));
        return mockResponse([{
          id: '00000000-0000-4000-8000-000000000001',
          reference: 'GL-2026-ABCDEF012345',
          application_status: 'Approved',
          updated_at: '2026-05-01T10:00:00.000Z'
        }]);
      }
      if (requestUrl.includes('/rest/v1/student_registrations') && options.method === 'DELETE') {
        return mockResponse([{
          id: '00000000-0000-4000-8000-000000000001',
          reference: 'GL-2026-ABCDEF012345'
        }]);
      }
      throw new Error('Unexpected request.');
    };
    const requestBase = {
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
        cookie: 'glight_admin_access=valid-admin-token'
      }
    };
    try {
      const updated = await invoke(registrations, {
        ...requestBase,
        method: 'PATCH',
        url: '/api/admin/registrations?id=00000000-0000-4000-8000-000000000001',
        body: { status: 'Approved' }
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.registration.application_status, 'Approved');

      const deleted = await invoke(registrations, {
        ...requestBase,
        method: 'DELETE',
        url: '/api/admin/registrations?id=00000000-0000-4000-8000-000000000001'
      });
      assert.equal(deleted.status, 200);
      assert.deepEqual(deleted.body, { deleted: true, reference: 'GL-2026-ABCDEF012345' });
      assert.equal(requests.filter((request) => request.url.includes('/auth/v1/user')).length, 2);
      assert.equal(requests.filter((request) => request.url.includes('/rest/v1/student_registrations')).length, 2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('administrator can export filtered registrations as spreadsheet-safe CSV', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }, async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (String(url).includes('/auth/v1/user')) {
        return mockResponse({ email: 'admin@example.com', app_metadata: { role: 'admin' } });
      }
      if (String(url).includes('/rest/v1/student_registrations')) {
        return mockResponse([{
          reference: 'GL-2026-ABCDEF012345',
          created_at: '2026-05-01T10:00:00.000Z',
          parent_name: '=HYPERLINK("https://example.com")',
          parent_email: 'parent@example.com',
          parent_phone: '+2348012345678',
          student_name: 'Tobi Okafor',
          student_age: 11,
          student_class: 'Primary 6',
          programme: 'Scratch Programming',
          learning_mode: 'Online',
          additional_information: 'None',
          parental_consent: true,
          application_status: 'Pending'
        }], 200, { 'Content-Range': '0-0/1' });
      }
      throw new Error('Unexpected request.');
    };
    try {
      const response = await invokeRaw(registrations, {
        method: 'GET',
        url: '/api/admin/registrations?format=csv&programme=Scratch%20Programming',
        headers: {
          origin: 'http://localhost:3000',
          cookie: 'glight_admin_access=valid-admin-token'
        }
      });
      assert.equal(response.status, 200);
      assert.match(response.headers['Content-Type'], /text\/csv/);
      assert.match(response.headers['Content-Disposition'], /glight-registrations-.*\.csv/);
      assert.match(response.body, /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
      assert.match(response.body, /"Yes","Pending"/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

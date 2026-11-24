'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const register = require('../api/register');
const adminSession = require('../api/admin/session');
const registrations = require('../api/admin/registrations');
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
  programme: 'Scratch Programming',
  learningMode: 'online',
  guardianConsent: true,
  website: ''
};

function withEnvironment(values, callback) {
  const previous = {};
  Object.keys(values).forEach((key) => {
    previous[key] = process.env[key];
    process.env[key] = values[key];
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

test('validates guardian consent, age range, delivery mode, and listed programme', () => {
  assert.equal(validateRegistration(validPayload).valid, true);
  assert.equal(validateRegistration({ ...validPayload, guardianConsent: false }).fields.guardianConsent !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, age: 3 }).fields.age !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, age: 19 }).fields.age !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, learningMode: 'hybrid' }).fields.learningMode !== undefined, true);
  assert.equal(validateRegistration({ ...validPayload, programme: 'Unlisted programme' }).fields.programme !== undefined, true);
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
    RATE_LIMIT_SECRET: 'r'.repeat(32)
  }, async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (String(url).includes('consume_registration_limit')) return mockResponse(true);
      if (String(url).includes('student_registrations')) {
        const inserted = JSON.parse(options.body);
        assert.equal(inserted.guardian_consent, true);
        assert.equal(inserted.parent_email, validPayload.parentEmail);
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
      assert.deepEqual(Object.keys(response.body), ['reference']);
      assert.equal(calls.length, 2);
      assert.equal(calls[1].options.headers.Authorization, 'Bearer test-service-role-key');
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
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }, async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
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
        return mockResponse([{
          id: '00000000-0000-4000-8000-000000000001',
          reference: 'GL-2026-ABCDEF012345',
          student_name: 'Tobi Okafor',
          guardian_consent: true
        }], 200, { 'Content-Range': '25-25/30' });
      }
      throw new Error('Unexpected Supabase request.');
    };
    try {
      const response = await invoke(registrations, {
        method: 'GET',
        url: '/api/admin/registrations?limit=25&offset=25',
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
      assert.equal(calls.length, 2);
      assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-admin-token');
      assert.equal(calls[1].options.headers.Authorization, 'Bearer test-service-role-key');
      assert.equal(calls[1].options.headers.Range, '25-49');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

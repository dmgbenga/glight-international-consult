'use strict';

const {
  RequestError,
  sendJson,
  requireAllowedOrigin,
  readJsonBody,
  parseCookies,
  logApiError
} = require('../../lib/http');
const {
  supabaseRequest,
  readResponseJson
} = require('../../lib/supabase');

const ACCESS_COOKIE = 'glight_admin_access';
const REFRESH_COOKIE = 'glight_admin_refresh';
const SESSION_ERROR = 'Administrator access is temporarily unavailable. Please try again.';

function cookieAttributes() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `; HttpOnly; SameSite=Strict; Path=/api${secure}`;
}

function setSessionCookies(res, session) {
  const attributes = cookieAttributes();
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}${attributes}`,
    `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}${attributes}`
  ]);
}

function clearSessionCookies(res) {
  const attributes = cookieAttributes();
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${attributes}`,
    `${REFRESH_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${attributes}`
  ]);
}

async function getUser(accessToken) {
  const response = await supabaseRequest('/auth/v1/user', { accessToken });
  return { response, user: await readResponseJson(response) };
}

function isAdministrator(user) {
  return Boolean(user && user.app_metadata && user.app_metadata.role === 'admin');
}

async function refreshSession(refreshToken) {
  const response = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken }
  });
  if (response.status === 400 || response.status === 401) return null;
  if (!response.ok) throw new Error(`Supabase session refresh returned HTTP ${response.status}.`);
  const session = await readResponseJson(response);
  if (!session || !session.access_token || !session.refresh_token) {
    throw new Error('Supabase returned an invalid refreshed session.');
  }
  const verified = await getUser(session.access_token);
  if (verified.response.status === 401 || verified.response.status === 403) return null;
  if (!verified.response.ok) throw new Error('The refreshed administrator session could not be verified.');
  if (!isAdministrator(verified.user)) return null;
  return { session, user: verified.user };
}

async function currentSession(req, res) {
  const cookies = parseCookies(req);
  const accessToken = cookies[ACCESS_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];
  if (!accessToken && !refreshToken) return { authenticated: false };

  if (accessToken) {
    const verified = await getUser(accessToken);
    if (verified.response.ok && isAdministrator(verified.user)) {
      return { authenticated: true, user: verified.user };
    }
    if (verified.response.ok && !isAdministrator(verified.user)) {
      clearSessionCookies(res);
      return { authenticated: false };
    }
    if (verified.response.status !== 401) throw new Error('Administrator session verification failed.');
  }

  if (!refreshToken) {
    clearSessionCookies(res);
    return { authenticated: false };
  }
  const refreshed = await refreshSession(refreshToken);
  if (!refreshed) {
    clearSessionCookies(res);
    return { authenticated: false };
  }
  setSessionCookies(res, refreshed.session);
  return { authenticated: true, user: refreshed.user };
}

async function login(email, password, res) {
  const response = await supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
  const session = await readResponseJson(response);
  if (response.status === 400 || response.status === 401) return { ok: false };
  if (response.status === 429) throw new RequestError(429, 'Too many sign-in attempts. Please wait and try again.');
  if (!response.ok) throw new Error(`Supabase sign-in returned HTTP ${response.status}.`);
  if (!session || !session.access_token || !session.refresh_token) {
    throw new Error('Supabase returned an invalid sign-in session.');
  }

  const verified = await getUser(session.access_token);
  if (verified.response.status === 401 || verified.response.status === 403) {
    return { ok: false };
  }
  if (!verified.response.ok) throw new Error('Administrator sign-in could not be verified.');
  if (!isAdministrator(verified.user)) return { ok: false, forbidden: true };

  setSessionCookies(res, session);
  return { ok: true, user: verified.user };
}

module.exports = async function adminSession(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
  }

  try {
    requireAllowedOrigin(req, { allowMissingOrigin: req.method === 'GET' });
    if (req.method === 'GET') {
      const session = await currentSession(req, res);
      return sendJson(res, 200, {
        authenticated: session.authenticated,
        user: session.authenticated ? { email: session.user.email } : null
      });
    }

    const payload = readJsonBody(req, 4 * 1024);
    if (payload.action === 'logout') {
      clearSessionCookies(res);
      return sendJson(res, 200, { ok: true });
    }
    if (payload.action !== 'login' || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
      throw new RequestError(400, 'Enter a valid administrator email and password.');
    }
    if (payload.email.length > 254 || payload.password.length > 1024) {
      throw new RequestError(400, 'Enter a valid administrator email and password.');
    }

    const result = await login(payload.email.trim(), payload.password, res);
    if (!result.ok) {
      if (result.forbidden) return sendJson(res, 403, { error: 'This account is not authorised to access the administrator dashboard.' });
      return sendJson(res, 401, { error: 'The email or password is incorrect.' });
    }
    return sendJson(res, 200, { authenticated: true, user: { email: result.user.email } });
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message });
    logApiError('admin-session', error);
    return sendJson(res, 503, { error: SESSION_ERROR });
  }
};

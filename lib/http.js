'use strict';

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([name, value]) => res.setHeader(name, value));
  }
  res.end(JSON.stringify(body));
}

function requireAllowedOrigin(req, options) {
  const origin = req.headers.origin;
  if (!origin) {
    if (options && options.allowMissingOrigin &&
        req.headers['sec-fetch-site'] === 'same-origin') return;
    if (process.env.NODE_ENV !== 'production') return;
    throw new RequestError(403, 'This request could not be verified.');
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch (error) {
    throw new RequestError(403, 'This request could not be verified.');
  }

  const allowedOrigins = new Set();
  if (process.env.PUBLIC_SITE_URL) {
    try {
      allowedOrigins.add(new URL(process.env.PUBLIC_SITE_URL).origin);
    } catch (error) {
      throw new Error('PUBLIC_SITE_URL must be a valid absolute URL.');
    }
  }
  if (process.env.VERCEL_URL) allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  if (!allowedOrigins.has(parsedOrigin)) {
    throw new RequestError(403, 'This request could not be verified.');
  }
}

function readJsonBody(req, maximumBytes) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new RequestError(415, 'Send this request using JSON.');
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > maximumBytes) throw new RequestError(413, 'The submitted form is too large.');

  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > maximumBytes) throw new RequestError(413, 'The submitted form is too large.');
    try {
      body = JSON.parse(body);
    } catch (error) {
      throw new RequestError(400, 'The submitted form is not valid JSON.');
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestError(400, 'The submitted form is invalid.');
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maximumBytes) {
    throw new RequestError(413, 'The submitted form is too large.');
  }
  return body;
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator > 0) {
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        cookies[name] = '';
      }
    }
    return cookies;
  }, {});
}

function logApiError(context, error) {
  console.error(`[${context}]`, {
    name: error && error.name ? error.name : 'Error',
    code: error && error.code ? error.code : undefined
  });
}

module.exports = {
  RequestError,
  sendJson,
  requireAllowedOrigin,
  readJsonBody,
  parseCookies,
  logApiError
};

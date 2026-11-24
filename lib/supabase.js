'use strict';

class SupabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new SupabaseConfigurationError('Supabase server configuration is incomplete.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new SupabaseConfigurationError('SUPABASE_URL must be a valid absolute URL.');
  }
  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new SupabaseConfigurationError('SUPABASE_URL must use HTTPS in production.');
  }

  return {
    baseUrl: parsedUrl.origin,
    anonKey,
    serviceRoleKey
  };
}

async function supabaseRequest(path, options) {
  const config = getSupabaseConfig();
  const useServiceRole = options && options.serviceRole;
  const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${options && options.accessToken ? options.accessToken : key}`,
    Accept: 'application/json'
  };
  if (options && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options && options.prefer) headers.Prefer = options.prefer;
  if (options && options.range) headers.Range = options.range;

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: options && options.method ? options.method : 'GET',
    headers,
    body: options && options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  return response;
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

module.exports = {
  SupabaseConfigurationError,
  getSupabaseConfig,
  supabaseRequest,
  readResponseJson
};

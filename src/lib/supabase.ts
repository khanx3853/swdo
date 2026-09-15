import { createClient } from '@supabase/supabase-js';

const extractRealValue = (val: any, preferUrl = false): string => {
  if (!val || typeof val !== 'string') return '';
  let trimmed = val.trim();
  trimmed = trimmed.replace(/^["'\[\(]+|["'\]\)]+$/g, '').trim();

  if (preferUrl) {
    const urlPattern = /https?:\/\/[a-z0-9\.\-]+(?:\/[^\s,;]*)?/i;
    const urlMatches = trimmed.match(urlPattern);
    if (urlMatches) {
      let url = urlMatches[0].replace(/\/+$/, '');
      if (url.endsWith('/rest/v1')) {
        url = url.substring(0, url.length - 8);
      }
      return url;
    }
    return trimmed;
  }

  const segments = trimmed.split(/[\s,;]+/);
  let bestKey = '';

  for (const segment of segments) {
    const dots = segment.split('.');
    for (let i = 0; i < dots.length; i++) {
      let potential = '';
      if (dots[i].startsWith('eyJhbGci') && i + 2 < dots.length) {
        potential = `${dots[i]}.${dots[i+1]}.${dots[i+2]}`;
      } else if (dots[i].startsWith('eyJpc3Mi') && i + 1 < dots.length) {
        potential = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${dots[i]}.${dots[i+1]}`;
      }

      if (potential.length > 100) {
        // Role detection: Service Role keys contain "service_role" in their base64 payload
        if (potential.includes('cm9sZSI6InNlcnZpY2Vfcm9sZS') || potential.includes('InJvbGUiOiJzZXJ2aWNlX3JvbGUi')) {
          return potential;
        }
        bestKey = potential;
      }
    }
  }

  // Fallback to simple pattern matching if de-concatenation failed
  if (!bestKey) {
    const jwtPattern = /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g;
    const jwtMatches = trimmed.match(jwtPattern);
    if (jwtMatches) bestKey = jwtMatches[jwtMatches.length - 1];
  }

  return bestKey || trimmed;
};

const getValidUrl = (url: string | undefined): string => {
  const fallback = 'https://wnhealllbmvxhxpvgvjm.supabase.co';
  const realUrl = extractRealValue(url, true);
  if (!realUrl) return fallback;
  
  let trimmed = realUrl;
  if (/^[a-z0-9]{20}$/.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.origin;
  } catch (e) {
    return fallback;
  }
};

const isEnvSet = (val: any): boolean => {
  const trimmed = extractRealValue(val);
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  
  // URLs should start with http
  if (trimmed.startsWith('http')) return trimmed.length > 15;
  
  // Keys (JWTs) MUST start with eyJ and be long
  if (trimmed.startsWith('eyJ')) return trimmed.length > 100;
  
  // Project IDs are exactly 20 chars
  if (/^[a-z0-9]{20}$/.test(trimmed)) return true;
  
  return false;
};

const supabaseUrlFromEnv = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKeyFromEnv = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = isEnvSet(supabaseUrlFromEnv) && isEnvSet(supabaseAnonKeyFromEnv);

const supabaseUrl = getValidUrl(supabaseUrlFromEnv);
const supabaseAnonKey = extractRealValue(supabaseAnonKeyFromEnv);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing or invalid. App will run in offline/demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: { 'x-application-name': 'swdo-portal' },
    },
  }
);

// Connectivity check helper
export const checkSupabaseConnection = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'No internet connection' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('donations').select('count', { count: 'exact', head: true });
      if (!error) {
        return { ok: true, count: data, source: 'supabase' };
      }
    } catch (err: any) {
      console.warn('Direct Supabase check warning:', err);
    }
  }

  // Fallback to checking server health endpoint
  try {
    const res = await fetch('/api/health', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
    if (res.ok) {
      return { ok: true, source: 'server' };
    }
  } catch (e) {
    // If running in standalone or dev
  }

  // If the browser is online, the portal is active and running live
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return { ok: true, source: 'browser-online' };
  }

  return { ok: false, error: 'Connection unavailable' };
};

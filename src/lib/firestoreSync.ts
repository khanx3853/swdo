import { supabase, isSupabaseConfigured } from './supabase';
import { patchSource } from '../utils/sourcePatch';
import {
  Donation,
  Beneficiary,
  Member,
  UserAccount,
  PortalSettings
} from '../types';

// Quota handling - mapping to general errors for Supabase
const DB_ERROR_KEY = 'db_connection_error';

function setDbError() {
  try {
    localStorage.setItem(DB_ERROR_KEY, 'true');
  } catch (e) {
    // If we can't even set an error flag, things are very full
    console.error('CRITICAL: localStorage is completely full. Use a different browser or clear cache.');
  }
}

export function isQuotaExceeded(): boolean {
  return localStorage.getItem(DB_ERROR_KEY) === 'true';
}

export function resetQuotaFlag() {
  localStorage.removeItem(DB_ERROR_KEY);
}

// Helper to wait for a specific time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for Supabase operations with exponential backoff
async function withRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  context = 'operation'
): Promise<T | null> {
  let lastError: any = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await operation();
      if (!error) return data;
      
      lastError = error;
      // Don't retry on specific non-transient errors (Table doesn't exist)
      if (isTableNotFoundError(error)) throw error; 
      
      console.warn(`Retry ${i + 1}/${maxRetries} for ${context} due to:`, error);
    } catch (err: any) {
      lastError = err;
      // "TypeError: Load failed" is often transient or network-related
      if (err.name === 'TypeError' && err.message === 'Load failed') {
        console.warn(`Network error during ${context}, retrying... (${i + 1}/${maxRetries})`);
      } else {
        throw err;
      }
    }
    
    // Wait before retrying (200ms, 800ms, 1800ms...)
    await delay(Math.pow(i + 1, 2) * 200);
  }
  
  throw lastError;
}

// Helper to check for "Table not found" errors
export function isTableNotFoundError(err: any): boolean {
  if (!err) return false;
  const code = err.code || (typeof err === 'object' ? err.code : null);
  const message = String(err.message || err.details || '');
  const hint = String(err.hint || '');
  
  return (
    code === 'PGRST205' || 
    code === '42P01' || 
    message.includes('PGRST205') || 
    message.includes('cache') ||
    hint.includes('table')
  );
}

function handleDbError(err: any, context: string) {
  // Suppress "Table not found" errors in console as they are often expected fallbacks
  if (isTableNotFoundError(err)) {
    return;
  }

  console.error(`Error during ${context}:`, err);
  
  // Specific handling for common errors
  if (err?.message === 'TypeError: Load failed' || (err?.name === 'TypeError' && err?.message?.includes('Load failed'))) {
    console.error(`NETWORK ERROR: The browser failed to reach Supabase during ${context}. This may be due to:
1. Large data payload (e.g., base64 videos/images) exceeding browser/server limits.
2. Unstable internet connection or VPN blocking the request.
3. Supabase project is paused or over-quota.`);
  }
}

// Known table columns in Supabase PostgreSQL schema to prevent PGRST204 errors
const TABLE_COLUMNS: Record<string, string[]> = {
  donations: [
    'id', 'Date', 'Donor Name', 'NIC No', 'Contact No', 'Permanent Address',
    'Profession', 'Amount', 'Transaction ID', 'Remarks', 'EnteredBy',
    'Category', 'ProofImage', 'Status', 'SubmittedAt', 'ApprovedBy',
    'ApprovedAt', 'RejectionReason', 'DonorEmail'
  ],
  settings: [
    'id', 'Foundation Name', 'SubTitle', 'Address', 'Chairperson',
    'Secretary', 'Treasurer', 'Easypaisa No', 'Easypaisa Title',
    'Bank No', 'Bank Title', 'Bank Account No', 'Account Title',
    'Currency', 'TreasurerSignature', 'AutoSmsSubmission', 'AutoSmsApproval',
    'AutoSmsBeneficiary', 'VeevoSmsHash', 'VeevoSenderNum', 'SmsSubmissionTemplate',
    'SmsApprovalTemplate', 'SmsBeneficiaryTemplate'
  ],
  beneficiaries: [
    'id', 'Date', 'Beneficiary Name', 'Father Name', 'NIC No',
    'Contact No', 'Permanent Address', 'Profession', 'Purpose',
    'Amount', 'Transaction ID', 'Remarks', 'VerifiedBy', 'Status'
  ],
  members: [
    'id', 'Name', 'Father Name', 'Designation', 'N.I.C No',
    'Address', 'Contact No', 'Joining Date', 'Expiry Date',
    'Remarks', 'NICImage', 'NICImageBack'
  ],
  users: [
    'id', 'username', 'password', 'Rights', 'Access', 'Theme'
  ],
  gallery_pictures: [
    'id', 'url', 'caption', 'createdAt'
  ],
  gallery_videos: [
    'id', 'url', 'caption', 'createdAt'
  ],
  sms_logs: [
    'id', 'recipient', 'message', 'type', 'status', 'timestamp', 'response'
  ]
};

// Helper function to strip all undefined values and client-side only fields before sending to DB
export function sanitizeForDb<T>(data: T, collectionName?: string): T {
  if (data === null || data === undefined) {
    return data;
  }
  try {
    let sanitized = JSON.parse(JSON.stringify(data));
    
    // List of fields to exclude from database persistence (client-side only or schema-missing)
    const excludeFields = [
      'isLiveAdded',
      'Source',
      'ProofLink',
      'SmsSent',
      'SmsMessageId'
    ];
    
    // Pack ProofLink into Remarks so we don't lose it
    if (typeof sanitized === 'object' && sanitized !== null && 'ProofLink' in sanitized && sanitized.ProofLink) {
      sanitized.Remarks = (sanitized.Remarks || '') + ' | PROOF: ' + sanitized.ProofLink;
    }
    
    if (typeof sanitized === 'object' && sanitized !== null) {
      excludeFields.forEach(field => {
        if (field in sanitized) {
          delete sanitized[field];
        }
      });

      // If this collection has a known column schema, keep ONLY the recognized columns
      if (collectionName && TABLE_COLUMNS[collectionName]) {
        const allowedColumns = new Set(TABLE_COLUMNS[collectionName]);
        const filtered: any = {};
        for (const key of Object.keys(sanitized)) {
          if (allowedColumns.has(key)) {
            filtered[key] = sanitized[key];
          }
        }
        sanitized = filtered;
      }
    }
    
    // Check for massive fields that might cause "Load failed" (Payload Too Large)
    // We enforce a 500MB limit for base64 strings as requested by user
    const SIZE_LIMIT = 500 * 1024 * 1024;
    Object.entries(sanitized).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > SIZE_LIMIT) {
        throw new Error(`Field "${key}" exceeds the maximum allowed size of 500MB. Please use a smaller file or a link instead.`);
      }
    });
    
    return sanitized;
  } catch {
    return data;
  }
}

// Map collection to API singular path
function getApiSingularName(collectionName: string): string {
  if (collectionName === 'donations') return 'donation';
  if (collectionName === 'beneficiaries') return 'beneficiary';
  if (collectionName === 'members') return 'member';
  if (collectionName === 'users') return 'user';
  if (collectionName === 'settings') return 'settings';
  if (collectionName === 'gallery_pictures') return 'gallery_picture';
  if (collectionName === 'gallery_videos') return 'gallery_video';
  if (collectionName === 'sms_logs') return 'sms_log';
  return collectionName.replace(/s$/, '');
}

// Real-time collection subscriptions (using Local Cache + Backend Server)
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialDataIfEmpty?: T[]
): () => void {
  const localKey = `swdo_${collectionName}`;
  let hasLocalData = false;

  // 1. Load from local cache immediately for zero-delay UI rendering
  try {
    const saved = localStorage.getItem(localKey);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        hasLocalData = true;
        onData(parsed as T[]);
      }
    }
  } catch (e) {}

  if (!hasLocalData && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
    onData(initialDataIfEmpty);
  }

  // 2. Fetch authoritative latest data from backend server
  const endpoint = `/api/${collectionName}`;
  fetch(endpoint)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(result => {
      const items = result?.data || result?.users || result?.logs || (Array.isArray(result) ? result : null);
      if (Array.isArray(items)) {
        try {
          localStorage.setItem(localKey, JSON.stringify(items));
        } catch (e) {}
        onData(items as T[]);
      } else if (!hasLocalData) {
        onData([]);
      }
    })
    .catch(e => {
      console.warn(`Backend fetch for ${collectionName} warning:`, e);
      if (!hasLocalData) {
        onData([]);
      }
    });

  return () => {};
}

// Single document subscription
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  onData: (data: T) => void,
  initialDataIfEmpty?: T
): () => void {
  const localKey = `swdo_${collectionName}_${docId}`;
  
  try {
    const saved = localStorage.getItem(localKey) || (collectionName === 'settings' ? localStorage.getItem('alkhair_settings') : null);
    if (saved) {
      onData(JSON.parse(saved));
    } else if (initialDataIfEmpty) {
      onData(initialDataIfEmpty);
    }
  } catch (e) {
    if (initialDataIfEmpty) onData(initialDataIfEmpty);
  }

  // Fetch from backend server
  if (collectionName === 'settings') {
    fetch('/api/settings')
      .then(res => res.json())
      .then(result => {
        if (result?.data) {
          try {
            localStorage.setItem(localKey, JSON.stringify(result.data));
            localStorage.setItem('alkhair_settings', JSON.stringify(result.data));
          } catch (e) {}
          onData(result.data as T);
        }
      })
      .catch(e => console.warn('Settings server fetch warning:', e));
  }

  return () => {};
}

// Helper methods to write data
export async function fetchCollection<T extends { id: string }>(
  collectionName: string,
  columns = '*'
): Promise<T[]> {
  // 1. Try server specific or generic endpoint first
  try {
    const url = `/api/${collectionName}?columns=${encodeURIComponent(columns)}`;
    const res = await fetch(url);
    if (res.ok) {
      const result = await res.json();
      const items = result?.data || result?.items || (Array.isArray(result) ? result : null);
      if (Array.isArray(items)) {
        return items.map(item => patchSource(item)) as T[];
      }
    }
  } catch (e) {
    // Server fetch fallback
  }

  try {
    const res = await fetch(`/api/collection/${encodeURIComponent(collectionName)}?columns=${encodeURIComponent(columns)}`);
    if (res.ok) {
      const result = await res.json();
      if (Array.isArray(result?.data)) {
        return result.data.map((item: any) => patchSource(item)) as T[];
      }
    }
  } catch (e) {}

  // 2. Try direct Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const data = await withRetry(
        () => supabase.from(collectionName).select(columns) as any,
        2,
        `fetching collection ${collectionName}`
      );
      return (data as any[] || []).map(item => patchSource(item)) as T[];
    } catch (err) {
      handleDbError(err, `fetching collection ${collectionName}`);
    }
  }

  // 3. Fallback to localStorage cache if we have nothing from server or Supabase!
  try {
    const saved = localStorage.getItem(`swdo_${collectionName}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as T[];
      }
    }
  } catch (e) {}

  return [];
}

export async function fetchDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  // 1. Try server specific endpoint first: /api/${collectionName}/${docId}
  try {
    const res = await fetch(`/api/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`);
    if (res.ok) {
      const result = await res.json();
      if (result?.data) {
        return patchSource(result.data) as T;
      }
    }
  } catch (e) {}

  // 2. Try generic server document endpoint: /api/document/${collectionName}/${docId}
  try {
    const res = await fetch(`/api/document/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`);
    if (res.ok) {
      const result = await res.json();
      if (result?.data) {
        return patchSource(result.data) as T;
      }
    }
  } catch (e) {}

  // 3. Check local storage cache
  try {
    const localKey = `swdo_${collectionName}_${docId}`;
    const cached = localStorage.getItem(localKey);
    const cachedUrl = localStorage.getItem(`swdo_media_url_${docId}`);

    if (cached) {
      const item = JSON.parse(cached);
      if (cachedUrl) {
        item.url = cachedUrl;
      }
      return item as T;
    }
    const colKey = `swdo_${collectionName}`;
    const colCached = localStorage.getItem(colKey);
    if (colCached) {
      const list = JSON.parse(colCached);
      if (Array.isArray(list)) {
        const found = list.find((x: any) => x.id === docId);
        if (found) {
          if (cachedUrl) {
            found.url = cachedUrl;
          }
          return found as T;
        }
      }
    }
    if (cachedUrl) {
      return { id: docId, url: cachedUrl } as any as T;
    }
  } catch (e) {}

  // 4. Fallback to direct supabase only if configured
  if (isSupabaseConfigured) {
    try {
      const data = await withRetry(
        () => supabase.from(collectionName).select('*').eq('id', docId).maybeSingle() as any,
        2,
        `fetching document ${collectionName}/${docId}`
      );
      return data ? patchSource(data as any) as T : null;
    } catch (err) {
      handleDbError(err, `fetching document ${collectionName}/${docId}`);
      return null;
    }
  }
  return null;
}

export async function saveToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
) {
  const localKey = `swdo_${collectionName}`;

  // 1. Update localStorage cache immediately (storing heavy base64 URLs separately to prevent QuotaExceededError)
  try {
    const saved = localStorage.getItem(localKey);
    let list = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(list)) list = [];

    const isGallery = collectionName === 'gallery_pictures' || collectionName === 'gallery_videos';
    const itemToStore = { ...item };

    if (isGallery && (item as any).url) {
      const urlStr = (item as any).url;
      // Only separate heavy Base64 data (starting with "data:"). HTTP/HTTPS links are tiny and should stay inline!
      if (urlStr.startsWith('data:')) {
        try {
          localStorage.setItem(`swdo_media_url_${item.id}`, urlStr);
        } catch (e) {
          console.warn("Failed to cache heavy media URL in localStorage, storing inline as fallback:", e);
        }
        delete (itemToStore as any).url; // Keep list small
      }
    }

    const idx = list.findIndex((x: any) => x.id === item.id || (collectionName === 'users' && x.username && (item as any).username && x.username.toLowerCase() === (item as any).username.toLowerCase()));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...itemToStore };
    } else {
      list.unshift(itemToStore);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to update collection list in localStorage:", e);
  }

  // 2. Call backend server save API immediately
  const singular = getApiSingularName(collectionName);
  try {
    await fetch(`/api/save-${singular}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.warn(`Failed to call /api/save-${singular}`, err);
  }
}

export async function deleteFromFirestore(collectionName: string, id: string) {
  const localKey = `swdo_${collectionName}`;

  // 1. Remove from localStorage cache
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      let list = JSON.parse(saved);
      if (Array.isArray(list)) {
        list = list.filter((x: any) => x.id !== id);
        localStorage.setItem(localKey, JSON.stringify(list));
      }
    }
  } catch (e) {}

  // 2. Call backend server delete API immediately
  const singular = getApiSingularName(collectionName);
  try {
    await fetch(`/api/delete-${singular}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.warn(`Failed to call /api/delete-${singular}`, err);
  }
}

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function addDocToFirestore(collectionName: string, data: any) {
  const isGallery = collectionName === 'gallery_pictures' || collectionName === 'gallery_videos';
  // Use a valid UUID to satisfy Postgres constraints on Supabase side
  const defaultId = isGallery ? generateUuid() : `doc-${Date.now()}`;
  const item = { ...data, id: data.id || defaultId };
  await saveToFirestore(collectionName, item);
  return item;
}

export async function saveDocToFirestore<T>(
  collectionName: string,
  docId: string,
  data: T
) {
  const localKey = `swdo_${collectionName}_${docId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
    if (collectionName === 'settings') {
      localStorage.setItem('alkhair_settings', JSON.stringify(data));
    }
  } catch (e) {}

  if (collectionName === 'settings') {
    try {
      await fetch('/api/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Failed to call /api/save-settings', err);
    }
  }
}

export async function saveBulkToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
) {
  if (!items || items.length === 0) return;

  const localKey = `swdo_${collectionName}`;
  try {
    const saved = localStorage.getItem(localKey);
    let current = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(current)) current = [];
    const itemMap = new Map(current.map((x: any) => [x.id, x]));
    for (const it of items) {
      if (it && it.id) {
        itemMap.set(it.id, Object.assign({}, itemMap.get(it.id) || {}, it));
      }
    }
    localStorage.setItem(localKey, JSON.stringify(Array.from(itemMap.values())));
  } catch (e) {}

  // Send to backend bulk save endpoint
  try {
    await fetch(`/api/save-bulk-${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    console.warn(`Failed to call /api/save-bulk-${collectionName}`, err);
  }
}

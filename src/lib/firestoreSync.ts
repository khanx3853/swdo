import { supabase } from './supabase';
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
  localStorage.setItem(DB_ERROR_KEY, 'true');
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
      // Don't retry on specific non-transient errors if identified
      if (error.code === '42P01') throw error; // Table doesn't exist
      
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

function handleDbError(err: any, context: string) {
  console.error(`Error during ${context}:`, err);
  
  // Specific handling for common errors
  if (err?.message === 'TypeError: Load failed' || (err?.name === 'TypeError' && err?.message?.includes('Load failed'))) {
    console.error(`NETWORK ERROR: The browser failed to reach Supabase during ${context}. This may be due to:
1. Large data payload (e.g., base64 videos/images) exceeding browser/server limits.
2. Unstable internet connection or VPN blocking the request.
3. Supabase project is paused or over-quota.`);
  }
}

// Helper function to strip all undefined values and client-side only fields before sending to DB
export function sanitizeForDb<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // List of fields to exclude from database persistence (client-side only or schema-missing)
    const excludeFields = ['isLiveAdded', 'Source'];
    
    if (typeof sanitized === 'object' && sanitized !== null) {
      excludeFields.forEach(field => {
        if (field in sanitized) {
          delete sanitized[field];
        }
      });
    }
    
    // Check for massive fields that might cause "Load failed" (Payload Too Large)
    // We enforce a 10MB limit for base64 strings to prevent connection resets
    const SIZE_LIMIT = 10 * 1024 * 1024;
    Object.entries(sanitized).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > SIZE_LIMIT) {
        throw new Error(`Field "${key}" exceeds the maximum allowed size of 10MB. Please use a smaller file or a link instead.`);
      }
    });
    
    return sanitized;
  } catch {
    return data;
  }
}

export async function saveBulkToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
) {
  try {
    const sanitized = items.map(item => sanitizeForDb(item));
    
    await withRetry(
      () => supabase.from(collectionName).upsert(sanitized) as any,
      2,
      `bulk save to ${collectionName}`
    );
  } catch (err) {
    console.error(`Failed to bulk save to DB [${collectionName}]:`, err);
    throw err;
  }
}

// Real-time collection subscriptions (using Supabase Realtime)
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialDataIfEmpty?: T[]
): () => void {
  // Initial fetch
  fetchCollection<T>(collectionName).then(data => {
    if (data.length === 0 && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
      // Show initial data immediately so UI isn't empty while seeding
      onData(initialDataIfEmpty);
      // Seed if empty using bulk upsert
      saveBulkToFirestore(collectionName, initialDataIfEmpty)
        .catch(err => console.error(`Seeding failed for ${collectionName}:`, err));
    } else {
      onData(data);
    }
  });

  // Subscribe to changes
  const channel = supabase
    .channel(`${collectionName}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: collectionName },
      () => {
        // Simple re-fetch on any change
        fetchCollection<T>(collectionName).then(onData);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Single document subscription
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  onData: (data: T) => void,
  initialDataIfEmpty?: T
): () => void {
  // Initial fetch
  fetchDocument<T>(collectionName, docId).then(data => {
    if (!data && initialDataIfEmpty) {
      saveDocToFirestore(collectionName, docId, initialDataIfEmpty)
        .then(() => fetchDocument<T>(collectionName, docId))
        .then(seededData => seededData && onData(seededData));
    } else if (data) {
      onData(data);
    }
  });

  // Subscribe to changes
  const channel = supabase
    .channel(`${collectionName}_${docId}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: collectionName, filter: `id=eq.${docId}` },
      () => {
        fetchDocument<T>(collectionName, docId).then(data => data && onData(data));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Helper methods to write data
export async function fetchCollection<T extends { id: string }>(
  collectionName: string,
  columns = '*'
): Promise<T[]> {
  try {
    const data = await withRetry(
      () => supabase.from(collectionName).select(columns) as any,
      3,
      `fetching collection ${collectionName}`
    );
    
    return (data as any[] || []).map(item => patchSource(item)) as T[];
  } catch (err) {
    handleDbError(err, `fetching collection ${collectionName}`);
    return [];
  }
}

export async function fetchDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const data = await withRetry(
      () => supabase.from(collectionName).select('*').eq('id', docId).maybeSingle() as any,
      3,
      `fetching document ${collectionName}/${docId}`
    );
    
    return data ? patchSource(data as any) as T : null;
  } catch (err) {
    handleDbError(err, `fetching document ${collectionName}/${docId}`);
    return null;
  }
}

export async function saveToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
) {
  try {
    const sanitized = sanitizeForDb(item);
    await withRetry(
      () => supabase.from(collectionName).upsert(sanitized) as any,
      2,
      `save to ${collectionName}`
    );
  } catch (err) {
    console.error(`Failed to save to DB [${collectionName}]:`, err);
    throw err;
  }
}

export async function deleteFromFirestore(collectionName: string, id: string) {
  try {
    await withRetry(
      () => supabase.from(collectionName).delete().eq('id', id) as any,
      2,
      `delete from ${collectionName}`
    );
  } catch (err) {
    console.error(`Failed to delete from DB [${collectionName}]:`, err);
  }
}

export async function addDocToFirestore(collectionName: string, data: any) {
  try {
    const sanitized = sanitizeForDb(data);
    const result = await withRetry(
      () => supabase.from(collectionName).insert(sanitized).select().single() as any,
      2,
      `add doc to ${collectionName}`
    );
    
    return result;
  } catch (err) {
    console.error(`Failed to add doc to DB [${collectionName}]:`, err);
    throw err;
  }
}

export async function saveDocToFirestore<T>(
  collectionName: string,
  docId: string,
  data: T
) {
  try {
    const sanitized = sanitizeForDb(data);
    // Ensure id matches docId for the upsert
    const payload = { ...sanitized, id: docId };
    await withRetry(
      () => supabase.from(collectionName).upsert(payload) as any,
      2,
      `save doc to ${collectionName}/${docId}`
    );
  } catch (err) {
    console.error(`Failed to save doc to DB [${collectionName}/${docId}]:`, err);
  }
}

import { supabase } from './supabase';
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

function handleDbError(err: any, context: string) {
  console.error(`Error during ${context}:`, err);
  // Optional: check for specific Supabase errors if needed
}

// Helper function to strip all undefined values before sending to DB
export function sanitizeForDb<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
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
      // Seed if empty
      Promise.all(initialDataIfEmpty.map(item => saveToFirestore(collectionName, item)))
        .then(() => fetchCollection<T>(collectionName))
        .then(seededData => onData(seededData));
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
  collectionName: string
): Promise<T[]> {
  try {
    const { data, error } = await supabase
      .from(collectionName)
      .select('*');
    
    if (error) throw error;
    return (data || []) as T[];
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
    const { data, error } = await supabase
      .from(collectionName)
      .select('*')
      .eq('id', docId)
      .maybeSingle();
    
    if (error) throw error;
    return data as T;
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
    const { error } = await supabase
      .from(collectionName)
      .upsert(sanitized);
    
    if (error) throw error;
  } catch (err) {
    console.error(`Failed to save to DB [${collectionName}]:`, err);
    throw err;
  }
}

export async function deleteFromFirestore(collectionName: string, id: string) {
  try {
    const { error } = await supabase
      .from(collectionName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (err) {
    console.error(`Failed to delete from DB [${collectionName}]:`, err);
  }
}

export async function addDocToFirestore(collectionName: string, data: any) {
  try {
    const sanitized = sanitizeForDb(data);
    const { data: result, error } = await supabase
      .from(collectionName)
      .insert(sanitized)
      .select()
      .single();
    
    if (error) throw error;
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
    const { error } = await supabase
      .from(collectionName)
      .upsert(payload);
    
    if (error) throw error;
  } catch (err) {
    console.error(`Failed to save doc to DB [${collectionName}/${docId}]:`, err);
  }
}

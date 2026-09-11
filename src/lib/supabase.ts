import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wnhealllbmvxhxpvgvjm.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaGVhbGxsYm12eGh4cHZndmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDM5ODcsImV4cCI6MjEwNDY3OTk4N30.U4YA-7_7VIScGiLm8wkeCmimqJyjBoXYE3GAKIhzDeg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App will run in demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
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
  try {
    const { data, error } = await supabase.from('donations').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { ok: true, count: data };
  } catch (err: any) {
    console.error('Supabase connectivity check failed:', err);
    return { ok: false, error: err.message || 'Unknown connectivity error' };
  }
};

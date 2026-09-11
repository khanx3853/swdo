import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://wnhealllbmvxhxpvgvjm.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaGVhbGxsYm12eGh4cHZndmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDM5ODcsImV4cCI6MjEwNDY3OTk4N30.U4YA-7_7VIScGiLm8wkeCmimqJyjBoXYE3GAKIhzDeg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App will run in demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

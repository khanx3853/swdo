const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseApiKey = process.env.SUPABASE_API_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://wnhealllbmvxhxpvgvjm.supabase.co',
  supabaseApiKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
);

// Test the connection against 'donations' table
supabase
  .from('donations')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) console.error('Supabase connection error:', error);
    else console.log('Supabase connected successfully! Sample data:', data);
  });

module.exports = supabase;

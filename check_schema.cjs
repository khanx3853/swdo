const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://wnhealllbmvxhxpvgvjm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaGVhbGxsYm12eGh4cHZndmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDM5ODcsImV4cCI6MjEwNDY3OTk4N30.U4YA-7_7VIScGiLm8wkeCmimqJyjBoXYE3GAKIhzDeg'
);

async function run() {
  const { data, error } = await supabase.from('beneficiaries').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();

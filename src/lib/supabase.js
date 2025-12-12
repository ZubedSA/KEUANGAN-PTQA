import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhdwkkkjjgerefswsjzr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZHdra2tqamdlcmVmc3dzanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzkwODEsImV4cCI6MjA4MDI1NTA4MX0.RnxRugJiB0ZgYiS3TuhzbNojePO3vAsB-JuAnheTGAs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

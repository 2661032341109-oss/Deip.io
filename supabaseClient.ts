import { createClient } from '@supabase/supabase-js';

// Configuration: Use Vite's import.meta.env for production variables
// Fallback to hardcoded keys only if env vars are missing (Safe for local dev/preview)
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://zlshhrgdkcesrhfdwvpq.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsc2hocmdka2Nlc3JoZmR3dnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDI5NjEsImV4cCI6MjA4MTk3ODk2MX0.aS6dijz1jMGTFezZ1DNzhc2Ttg75_jpmeoH0MAXKpCs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});
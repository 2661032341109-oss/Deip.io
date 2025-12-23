
import { createClient } from '@supabase/supabase-js';

// Configuration: Prioritize Environment Variables, Fallback to Hardcoded (for prototype safety)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://zlshhrgdkcesrhfdwvpq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsc2hocmdka2Nlc3JoZmR3dnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDI5NjEsImV4cCI6MjA4MTk3ODk2MX0.aS6dijz1jMGTFezZ1DNzhc2Ttg75_jpmeoH0MAXKpCs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

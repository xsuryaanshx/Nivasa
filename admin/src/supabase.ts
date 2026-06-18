import { createClient } from "@supabase/supabase-js";

// Read Supabase environment variables
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "") as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "") as string;

if (!SUPABASE_ANON_KEY) {
  // If running locally, let's try to fall back or warn
  console.warn("VITE_SUPABASE_ANON_KEY is not defined in the admin application environment.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

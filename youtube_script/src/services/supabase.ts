import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

if (!supabaseInstance) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Auth features may not work.');
  }
  supabaseInstance = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
  );
}

export const supabase = supabaseInstance!;

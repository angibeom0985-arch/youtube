import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
        global: {
          headers: { "X-Client-Info": "abuse-detection" },
        },
      })
    : null;

export type SupabaseUserResult = {
  user: { id: string; email?: string | null } | null;
  client: ReturnType<typeof createClient> | null;
  usingAdmin: boolean;
  error?: string;
};

export const getSupabaseUser = async (token: string): Promise<SupabaseUserResult> => {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      return { user: data.user, client: supabaseAdmin, usingAdmin: true };
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, client: null, usingAdmin: false, error: "missing_supabase_config" };
  }

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data, error } = await authedClient.auth.getUser(token);
  if (error || !data?.user) {
    return {
      user: null,
      client: authedClient,
      usingAdmin: false,
      error: error?.message || "invalid_token",
    };
  }

  return { user: data.user, client: authedClient, usingAdmin: false };
};

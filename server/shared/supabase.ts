import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isServiceRoleKey = (key: string | undefined): boolean => {
  if (!key) return false;
  const payload = decodeJwtPayload(key);
  return payload?.role === "service_role";
};

const hasServiceRoleKey = isServiceRoleKey(supabaseServiceKey);
if (supabaseServiceKey && !hasServiceRoleKey) {
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY is not a service_role key. Falling back to user-scoped auth client.",
  );
}

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey && hasServiceRoleKey
    ? (createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
        global: {
          headers: { "X-Client-Info": "abuse-detection" },
        },
      }) as any)
    : null;

export type SupabaseUserResult = {
  user: { id: string; email?: string | null } | null;
  client: any;
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
  }) as any;

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

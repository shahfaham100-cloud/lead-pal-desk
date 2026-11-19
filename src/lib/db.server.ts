import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Uses only the public key; order access is gated by DB_ACCESS_TOKEN inside database functions,
// so no private service key is needed (works on Lovable and on Hostinger).
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing on this server.`);
  return value;
}

export function dbToken(): string {
  return required("DB_ACCESS_TOKEN");
}

export function db() {
  const url = required("SUPABASE_URL");
  const key = required("SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("x-dsx-token", dbToken());
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Offline-first: cloud sync is optional. Use a dummy client when Supabase is
// not configured so the app runs cleanly without a remote project.
export const supabase = createSupabaseClient(
  SUPABASE_URL || "http://localhost-disabled",
  SUPABASE_ANON_KEY || "disabled"
);

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine;
}

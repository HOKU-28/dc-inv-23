import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rpyfxshdcvwofvkovpkr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJweWZ4c2hkY3Z3b2Z2a292cGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTI4NjIsImV4cCI6MjA5NzQyODg2Mn0.3U8xVPChl4j8qBH1CdJhSH4W7Uc6XqpGzeVLy_jULfo";

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine;
}

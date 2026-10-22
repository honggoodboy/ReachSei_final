
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dxueseerbvccuogcvelm.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_s0rBfzyq2SvVcSHJMnHtEA_NpoN1ZXI";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in environment. Using default config."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

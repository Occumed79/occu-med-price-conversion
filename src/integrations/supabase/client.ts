import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't crash the app on import when env vars are absent (e.g. local dev or a
  // Render service that hasn't been configured yet). Calls made against this
  // client will fail at request time, which callers are expected to handle.
  console.warn(
    "Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set; " +
      "the Supabase client is unconfigured until they are provided.",
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "http://localhost",
  SUPABASE_ANON_KEY ?? "public-anon-key",
  {
    auth: { persistSession: false },
  },
);

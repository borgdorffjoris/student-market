import { createClient } from "@supabase/supabase-js";

// This client uses the service_role key and must NEVER be imported
// into any file that runs in the browser. Only use it inside
// app/api/**/route.js files (server-side).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

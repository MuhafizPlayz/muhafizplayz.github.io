/* Creates the Supabase client (`sb`) used by every other script.
   If config.js still has the placeholders, `sb` is null and pages show a setup message. */
const MP_CONFIGURED =
  /^https:\/\/[^\s]+$/.test(SUPABASE_URL) && !/^PASTE_/.test(SUPABASE_PUBLISHABLE_KEY) && !!window.supabase;

const sb = MP_CONFIGURED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;

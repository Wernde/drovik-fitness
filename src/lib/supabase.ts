/**
 * supabase.ts — single Supabase client instance for the whole app.
 *
 * Import `supabase` from here whenever you need to read/write the cloud DB
 * or call Supabase Auth. Never create a second client.
 *
 * The two env vars are set in .env.local (local dev) and GitHub Actions
 * secrets (production). Both are VITE_ prefixed so Vite bundles them into
 * the client — the anon key is safe to expose because RLS + auth is the
 * real protection (see CLAUDE.md for the rationale).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnon)

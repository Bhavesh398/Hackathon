import { createClient } from '@supabase/supabase-js'

// Use Vite environment variables (import.meta.env) so keys come from .env and are correct per environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string || ''

if (!supabaseUrl || !supabaseAnonKey) {
	// eslint-disable-next-line no-console
	console.warn('Supabase URL or anon key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
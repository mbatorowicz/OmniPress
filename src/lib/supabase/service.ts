import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabaseUrl } from './resolve-env';

/** Klient service role — tylko worker / skrypty serwerowe, nigdy w UI. */
export function createServiceSupabase(): SupabaseClient {
	const url = resolveSupabaseUrl();
	const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error('Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY (worker)');
	}
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isServiceSupabaseConfigured(): boolean {
	return Boolean(resolveSupabaseUrl() && import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
}

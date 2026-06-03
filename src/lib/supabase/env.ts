import {
	resolveSupabaseAnonKey,
	resolveSupabaseUrl,
} from './resolve-env';

export function getSupabaseEnv() {
	const url = resolveSupabaseUrl();
	const anonKey = resolveSupabaseAnonKey();

	if (!url || !anonKey) {
		throw new Error(
			'Brak URL lub klucza Supabase. Podłącz integrację Vercel ↔ Supabase (bez prefiksu STORAGE) lub uzupełnij PUBLIC_SUPABASE_URL i PUBLIC_SUPABASE_ANON_KEY w .env',
		);
	}

	return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
	return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}

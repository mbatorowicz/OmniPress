export function getSupabaseEnv() {
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error(
			'Brak PUBLIC_SUPABASE_URL lub PUBLIC_SUPABASE_ANON_KEY. Skopiuj .env.example do .env',
		);
	}

	return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
	return Boolean(
		import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
	);
}

/**
 * Odczyt zmiennych Supabase z różnych konwencji (Astro, Vercel Integration, Next).
 * Nie musisz ręcznie dublować PUBLIC_* po podłączeniu integracji Vercel ↔ Supabase.
 */

function metaEnv(): Record<string, unknown> {
	return ((import.meta as { env?: Record<string, unknown> }).env ?? {}) as Record<string, unknown>;
}

function pickEnv(...keys: string[]): string | undefined {
	for (const key of keys) {
		const fromMeta = metaEnv()[key];
		if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
		const fromProc = typeof process !== 'undefined' ? process.env[key] : undefined;
		if (typeof fromProc === 'string' && fromProc.trim()) return fromProc.trim();
	}
	return undefined;
}

function scanEnv(predicate: (key: string, value: string) => boolean): string | undefined {
	for (const [key, value] of Object.entries(metaEnv())) {
		if (typeof value === 'string' && value.trim() && predicate(key, value.trim())) {
			return value.trim();
		}
	}
	if (typeof process === 'undefined') return undefined;
	for (const [key, value] of Object.entries(process.env)) {
		if (typeof value === 'string' && value.trim() && predicate(key, value.trim())) {
			return value.trim();
		}
	}
	return undefined;
}

export function resolveSupabaseUrl(): string | undefined {
	const explicit = pickEnv(
		'PUBLIC_SUPABASE_URL',
		'SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_URL',
		'STORAGE_URL',
	);

	if (explicit) return explicit;

	return scanEnv(
		(key, value) =>
			value.includes('supabase.co') &&
			!value.includes('postgres') &&
			(key.endsWith('_SUPABASE_URL') ||
				key === 'SUPABASE_URL' ||
				(key.endsWith('_URL') && key.includes('SUPABASE'))),
	);
}

export function resolveSupabaseAnonKey(): string | undefined {
	// JWT anon key — wymagany przez Auth; publishable key (sb_publishable_*) nie obsługuje signIn
	const explicit = pickEnv(
		'PUBLIC_SUPABASE_ANON_KEY',
		'SUPABASE_ANON_KEY',
		'NEXT_PUBLIC_SUPABASE_ANON_KEY',
		'STORAGE_ANON_KEY',
	);

	if (explicit) return explicit;

	return scanEnv(
		(key) =>
			(key.includes('ANON') || key.endsWith('_ANON_KEY')) &&
			(key.includes('SUPABASE') || key.startsWith('STORAGE_') || key.startsWith('PUBLIC_')),
	);
}

export function resolveServiceRoleKey(): string | undefined {
	return pickEnv(
		'SUPABASE_SERVICE_ROLE_KEY',
		'STORAGE_SERVICE_ROLE_KEY',
		'SUPABASE_SERVICE_KEY',
	);
}

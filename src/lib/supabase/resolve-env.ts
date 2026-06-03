/**
 * Odczyt zmiennych Supabase z różnych konwencji (Astro, Vercel Integration, Next).
 * Nie musisz ręcznie dublować PUBLIC_* po podłączeniu integracji Vercel ↔ Supabase.
 */

function pickEnv(...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = import.meta.env[key];
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}
	return undefined;
}

function scanEnv(predicate: (key: string, value: string) => boolean): string | undefined {
	for (const [key, value] of Object.entries(import.meta.env)) {
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
	const explicit = pickEnv(
		'PUBLIC_SUPABASE_ANON_KEY',
		'SUPABASE_ANON_KEY',
		'NEXT_PUBLIC_SUPABASE_ANON_KEY',
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
		'SUPABASE_PUBLISHABLE_KEY',
		'STORAGE_ANON_KEY',
	);

	if (explicit) return explicit;

	return scanEnv(
		(key, value) =>
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

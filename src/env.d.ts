/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** Wstrzykiwane przy buildzie z package.json (SSOT semver) */
	readonly PUBLIC_APP_VERSION: string;
	/** Wstrzykiwane przy buildzie z git / Vercel (SSOT buildu) */
	readonly PUBLIC_APP_COMMIT: string;
	/** semver+commit, np. 0.1.0+a1b2c3d */
	readonly PUBLIC_APP_VERSION_LABEL: string;
	readonly PUBLIC_SUPABASE_URL?: string;
	readonly PUBLIC_SUPABASE_ANON_KEY?: string;
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_ANON_KEY?: string;
	readonly STORAGE_URL?: string;
	readonly STORAGE_ANON_KEY?: string;
	readonly SUPABASE_SERVICE_ROLE_KEY?: string;
	readonly ENCRYPTION_KEY?: string;
	readonly CRON_SECRET?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

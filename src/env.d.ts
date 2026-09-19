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
	readonly VERCEL_TOKEN?: string;
	readonly UPSTASH_REDIS_REST_URL?: string;
	readonly UPSTASH_REDIS_REST_TOKEN?: string;
	readonly TELEGRAM_BOT_TOKEN?: string;
	readonly TELEGRAM_CHAT_ID?: string;
	/** Sekret podpisu Svix webhooka Resend Receiving (`whsec_…`). */
	readonly RESEND_WEBHOOK_SECRET?: string;
	/** Klucz API Resend — GET `/emails/receiving/{id}` (treść maila, nie logować). */
	readonly RESEND_API_KEY?: string;
	/** Allowlista From (przecinki / nowe linie). Parser: `parseAllowlist`. */
	readonly INBOUND_ALLOWED_FROM?: string;
	/** Slug jednostki dla szkicow z poczty (np. gmina-miedzna). */
	readonly INBOUND_DEFAULT_SITE_SLUG?: string;
	/** UUID profilu, gdy nadawca nie ma konta w panelu. */
	readonly INBOUND_FALLBACK_AUTHOR_ID?: string;
	/** Model AI Gateway (pusty string = wyłącz enrichment). Domyślnie xai/grok-4.1-fast-non-reasoning. */
	readonly INBOUND_AI_MODEL?: string;
	/** Mapa email:slug — dokładny korespondent. */
	readonly INBOUND_SITE_BY_EMAIL?: string;
	/** Mapa domena:slug (poddomeny też). */
	readonly INBOUND_SITE_BY_DOMAIN?: string;
	/** Klucz Vercel AI Gateway — lokalnie; na Vercel wystarczy OIDC. */
	readonly AI_GATEWAY_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

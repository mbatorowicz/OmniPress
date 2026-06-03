/**
 * Metadane aplikacji — wartości buildu wstrzykiwane w astro.config.mjs (nie edytuj ręcznie).
 * SSOT semver: package.json | SSOT commit: git / VERCEL_GIT_COMMIT_SHA
 */
export const APP = {
	name: 'OmniPress',
	repositoryUrl: 'https://github.com/mbatorowicz/OmniPress',
	/** Produkcja — SSOT adresu w linkach Auth (reset, callback) */
	productionOrigin: 'https://omni-press.vercel.app',
	localOrigin: 'http://localhost:4321',
} as const;

/** Origin do redirectów Supabase Auth (reset hasła, magic link) */
export function getAuthRedirectOrigin(requestUrl?: URL): string {
	if (import.meta.env.VERCEL_ENV === 'production') {
		return APP.productionOrigin;
	}
	if (import.meta.env.VERCEL_URL) {
		return `https://${import.meta.env.VERCEL_URL}`;
	}
	if (requestUrl && !requestUrl.hostname.includes('localhost')) {
		return requestUrl.origin;
	}
	return APP.productionOrigin;
}

export function authResetPasswordUrl(origin?: string): string {
	const base = origin ?? APP.productionOrigin;
	return `${base}/auth/reset-password`;
}

export function getBuildInfo() {
	const version = import.meta.env.PUBLIC_APP_VERSION ?? '0.0.0';
	const commit = import.meta.env.PUBLIC_APP_COMMIT ?? 'unknown';
	const versionLabel =
		import.meta.env.PUBLIC_APP_VERSION_LABEL ?? `${version}+${commit}`;

	return { version, commit, versionLabel } as const;
}

export function getCommitUrl(commit: string) {
	return `${APP.repositoryUrl}/commit/${commit}`;
}

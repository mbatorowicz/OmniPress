/**
 * Metadane aplikacji — wartości buildu wstrzykiwane w astro.config.mjs (nie edytuj ręcznie).
 * SSOT semver: package.json | SSOT commit: git / VERCEL_GIT_COMMIT_SHA
 */
export const APP = {
	name: 'OmniPress',
	repositoryUrl: 'https://github.com/mbatorowicz/OmniPress',
} as const;

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

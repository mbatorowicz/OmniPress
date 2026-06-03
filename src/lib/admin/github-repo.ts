/** Normalizuje pole repozytorium do formatu owner/nazwa (bez .git, bez URL). */
export function normalizeGitHubRepo(input: string): string {
	let s = input.trim();
	if (!s) return '';

	const https = s.match(/^https?:\/\/github\.com\/([^/]+\/[^/?#]+?)(?:\.git)?\/?$/i);
	if (https) return https[1];

	const ssh = s.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
	if (ssh) return ssh[1];

	if (s.endsWith('.git')) s = s.slice(0, -4);
	return s.replace(/\/+$/, '');
}

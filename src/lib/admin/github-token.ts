import { probeGitHubRepository, type GitHubConfig } from '@/lib/publish/github-api';

export type GitHubTokenKind = 'fine_grained' | 'classic' | 'unknown';

export function classifyGitHubToken(token: string): GitHubTokenKind {
	const trimmed = token.trim();
	if (trimmed.startsWith('github_pat_')) return 'fine_grained';
	if (trimmed.startsWith('ghp_') || trimmed.startsWith('gho_') || trimmed.startsWith('ghu_')) {
		return 'classic';
	}
	return 'unknown';
}

export type GitHubTokenAudit = {
	kind: GitHubTokenKind;
	repoAccessible: boolean;
	repoDetail: string;
	/** Data z nagłówka GitHub (np. „2026-09-01 08:07:47 UTC”); null dla tokenu bezterminowego. */
	expiresAt: string | null;
};

/** Sprawdza typ tokena, dostęp do repozytorium i termin ważności. */
export async function auditGitHubToken(
	cfg: GitHubConfig,
	token: string,
): Promise<GitHubTokenAudit> {
	const kind = classifyGitHubToken(token);
	const probe = await probeGitHubRepository(cfg, token.trim());

	return {
		kind,
		repoAccessible: probe.ok,
		repoDetail: probe.ok
			? `${cfg.owner}/${cfg.repo}`
			: `HTTP ${probe.status}: ${probe.detail}`,
		expiresAt: probe.ok ? (probe.tokenExpiresAt ?? null) : null,
	};
}

/** „2026-09-01 08:07:47 UTC” → „1 września 2026”; przy nieznanym formacie zwraca wejście. */
export function formatTokenExpiry(raw: string): string {
	const parsed = new Date(raw.replace(' UTC', 'Z').replace(' ', 'T'));
	if (Number.isNaN(parsed.getTime())) return raw;
	return parsed.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

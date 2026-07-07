import { probeGitHubRepository, type GitHubRepoConfig } from '@/lib/publish/github-api';

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
};

/** Sprawdza typ tokena i dostęp do skonfigurowanego repozytorium. */
export async function auditGitHubToken(
	cfg: GitHubRepoConfig,
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
	};
}

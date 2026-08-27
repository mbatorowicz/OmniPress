/** Konfiguracja repozytorium GitHub, adresy API i klasyfikacja błędów HTTP. */
import { normalizeGitHubRepo } from '@/lib/admin/github-repo';
import { parseContentLayout, type ContentLayout } from './content-layout';

export type GitHubConfig = {
	owner: string;
	repo: string;
	branch: string;
	contentPath: string;
	contentLayout: ContentLayout;
	/** Np. post-files → /post-files/{slug}/plik.pdf (public/ po buildzie Astro). */
	assetPublicBase: string | null;
};

export type GitHubFileMeta = {
	sha: string;
	path: string;
};

export type GitHubTextFileWrite = {
	path: string;
	content: string;
};

export type GitHubBinaryFileWrite = {
	path: string;
	content: ArrayBuffer | Uint8Array;
};

/** Plik do zapisu w jednym commicie (tekst UTF-8 lub binaria base64). */
export type GitHubFileWrite = GitHubTextFileWrite | GitHubBinaryFileWrite;

export function isBinaryFileWrite(file: GitHubFileWrite): file is GitHubBinaryFileWrite {
	return typeof file.content !== 'string';
}

export function binaryToArrayBuffer(content: ArrayBuffer | Uint8Array): ArrayBuffer {
	if (content instanceof ArrayBuffer) return content;
	return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
}

export const GH_API = 'https://api.github.com';

/** Contents API + base64 w JSON jest ciężki dla dużych plików — powyżej progu Git Data API. */
export const LARGE_FILE_GIT_DATA_BYTES = 8 * 1024 * 1024;
/** Konflikty SHA przy równoległej publikacji (Contents API 409 / ref tip) — odśwież i ponów. */
export const CONTENTS_CONFLICT_RETRIES = 4;

export function gitBranchRefGetUrl(cfg: GitHubConfig): string {
	return `${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`;
}

/** GitHub: GET używa /git/ref/, PATCH /git/refs/ — inaczej 404. */
export function gitBranchRefUpdateUrl(cfg: GitHubConfig): string {
	return `${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`;
}

/** @internal — testy URL Git ref API */
export function gitBranchRefUrls(cfg: GitHubConfig): { get: string; patch: string } {
	return { get: gitBranchRefGetUrl(cfg), patch: gitBranchRefUpdateUrl(cfg) };
}

export function parseGitHubRepoConfig(config: Record<string, unknown>): GitHubConfig | null {
	const repoRaw = normalizeGitHubRepo(String(config.repo ?? ''));
	if (!repoRaw.includes('/')) return null;
	const [owner, repo] = repoRaw.split('/', 2).map((s) => s.trim());
	if (!owner || !repo) return null;
	const branch =
		typeof config.branch === 'string' && config.branch.trim() ? config.branch.trim() : 'main';
	const contentPath =
		typeof config.content_path === 'string' && config.content_path.trim()
			? config.content_path.trim()
			: 'src/content';
	const assetPublicBase =
		typeof config.asset_public_base === 'string' && config.asset_public_base.trim()
			? config.asset_public_base.trim().replace(/^\/+|\/+$/g, '')
			: null;
	return {
		owner,
		repo,
		branch,
		contentPath,
		contentLayout: parseContentLayout(config),
		assetPublicBase,
	};
}

export function ghHeaders(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'OmniPress',
	};
}

export function ghJsonHeaders(token: string): HeadersInit {
	return { ...ghHeaders(token), 'Content-Type': 'application/json' };
}

export function isGitHubRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 403 || status === 409;
}

/** Status z komunikatu `GitHub <operacja> <kod>: …` — lista operacji rośnie, więc dopasowanie jest ogólne. */
export function httpStatusFromError(message: string): number | null {
	const m = message.match(/GitHub (?:[A-Za-z]+ )+(\d{3}):/i);
	return m ? Number(m[1]) : null;
}

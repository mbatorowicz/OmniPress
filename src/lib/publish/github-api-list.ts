/** Listowanie zawartości repozytorium: drzewo, wpisy .md, załączniki obok wpisu, sondy konfiguracji. */
import { encodeGitHubPath, parseExternalGitHubPath } from './paths';
import { GH_API, ghHeaders, type GitHubConfig } from './github-api-config';
import { getBranchHeadCommitSha, getCommitTreeSha } from './github-api-read';

export async function listGitHubTreeBlobPaths(cfg: GitHubConfig, token: string): Promise<string[]> {
	const headSha = await getBranchHeadCommitSha(cfg, token);
	const treeSha = await getCommitTreeSha(cfg, token, headSha);

	const treeRes = await fetch(
		`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees/${treeSha}?recursive=1`,
		{ headers: ghHeaders(token) },
	);
	if (!treeRes.ok) {
		const text = await treeRes.text();
		throw new Error(`GitHub tree ${treeRes.status}: ${text.slice(0, 200)}`);
	}
	const treeJson = (await treeRes.json()) as { tree?: { path: string; type: string }[] };
	return (treeJson.tree ?? []).filter((item) => item.type === 'blob').map((item) => item.path);
}

/** Lista plików .md wpisów w content_path (flat lub folder/index.md). */
export function filterGitHubMarkdownPosts(cfg: GitHubConfig, blobPaths: string[]): string[] {
	const prefix = `${cfg.contentPath.replace(/^\/+|\/+$/g, '')}/`;
	const mdFiles = blobPaths.filter(
		(path) => path.startsWith(prefix) && path.toLowerCase().endsWith('.md'),
	);

	if (cfg.contentLayout === 'folder') {
		return mdFiles.filter((path) => {
			const rel = path.slice(prefix.length);
			const parts = rel.split('/');
			return parts.length === 2 && parts[1]!.toLowerCase() === 'index.md';
		});
	}

	return mdFiles.filter((path) => {
		const rel = path.slice(prefix.length);
		return rel.length > 0 && !rel.includes('/');
	});
}

export async function listGitHubMarkdownPosts(
	cfg: GitHubConfig,
	token: string,
): Promise<string[]> {
	const blobs = await listGitHubTreeBlobPaths(cfg, token);
	return filterGitHubMarkdownPosts(cfg, blobs);
}

export type GitHubDirBlob = {
	path: string;
	sha: string;
	name: string;
};

/** Zawartość jednego katalogu (Contents API) — bez recursive tree całego repo. */
export async function listGitHubDirectoryBlobs(
	cfg: GitHubConfig,
	token: string,
	dirPath: string,
): Promise<GitHubDirBlob[]> {
	const trimmed = dirPath.replace(/^\/+|\/+$/g, '');
	if (!trimmed) return [];
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(trimmed)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) return [];
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub contents dir ${res.status}: ${text.slice(0, 200)}`);
	}
	const json = (await res.json()) as
		| { path?: string; sha?: string; name?: string; type?: string }[]
		| { path?: string; type?: string };
	if (!Array.isArray(json)) return [];
	return json
		.filter((item) => item.type === 'file' && item.path && item.sha && item.name)
		.map((item) => ({
			path: item.path as string,
			sha: item.sha as string,
			name: item.name as string,
		}));
}

/** Pliki w folderze wpisu (PDF, obrazy) — bez podfolderów i bez .md. */
export function listGitHubSiblingAssets(
	allBlobPaths: string[],
	markdownPath: string,
): string[] {
	const folder = markdownPath.replace(/\/[^/]+$/i, '');
	const prefix = `${folder}/`;
	return allBlobPaths.filter((path) => {
		if (!path.startsWith(prefix)) return false;
		const rel = path.slice(prefix.length);
		if (!rel || rel.includes('/')) return false;
		return !rel.toLowerCase().endsWith('.md');
	});
}

/** Ścieżki do usunięcia z repo — index.md + cały folder wpisu (layout folder). */
export function expandGitHubWithdrawPaths(
	externalIds: string[],
	cfg: GitHubConfig,
	allBlobPaths: string[],
): string[] {
	const out = new Set<string>();
	for (const externalId of externalIds) {
		const mdPath = parseExternalGitHubPath(externalId);
		if (!mdPath) continue;
		out.add(mdPath);
		if (cfg.contentLayout === 'folder') {
			const folderPrefix = `${mdPath.replace(/\/[^/]+$/i, '')}/`;
			for (const assetPath of allBlobPaths) {
				if (assetPath.startsWith(folderPrefix)) out.add(assetPath);
			}
		}
	}
	return [...out];
}

/**
 * Ścieżki withdraw bez recursive tree całego repo —
 * Contents API na folder wpisu (layout folder) lub sam plik .md (flat).
 */
export async function resolveGitHubWithdrawPaths(
	cfg: GitHubConfig,
	token: string,
	externalIds: string[],
): Promise<string[]> {
	const out = new Set<string>();
	await Promise.all(
		externalIds.map(async (externalId) => {
			const mdPath = parseExternalGitHubPath(externalId);
			if (!mdPath) return;
			out.add(mdPath);
			if (cfg.contentLayout !== 'folder') return;
			const folder = mdPath.replace(/\/[^/]+$/i, '');
			try {
				const blobs = await listGitHubDirectoryBlobs(cfg, token, folder);
				for (const blob of blobs) out.add(blob.path);
			} catch {
				out.add(mdPath);
			}
		}),
	);
	return [...out];
}

export async function probeGitHubRepository(
	cfg: GitHubConfig,
	token: string,
): Promise<
	{ ok: true; tokenExpiresAt?: string } | { ok: false; status: number; detail: string }
> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.ok) {
		// GitHub podaje termin ważności PAT tylko w nagłówku odpowiedzi.
		const expiration = res.headers.get('github-authentication-token-expiration');
		return expiration ? { ok: true, tokenExpiresAt: expiration } : { ok: true };
	}
	const text = await res.text();
	return { ok: false, status: res.status, detail: text.slice(0, 200) };
}

export async function probeGitHubContentPath(
	cfg: GitHubConfig,
	token: string,
): Promise<{ ok: true } | { ok: false; detail: string }> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(cfg.contentPath)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) {
		return {
			ok: false,
			detail: `Folder „${cfg.contentPath}” nie istnieje na branchu „${cfg.branch}”.`,
		};
	}
	if (!res.ok) {
		const text = await res.text();
		return { ok: false, detail: `GitHub contents: HTTP ${res.status} — ${text.slice(0, 160)}` };
	}
	return { ok: true };
}

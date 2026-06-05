import { encodeGitHubPath, parseExternalGitHubPath } from './paths';
import { bytesToBase64, textToBase64 } from './assets';
import { normalizeGitHubRepo } from '@/lib/admin/github-repo';
import { parseContentLayout, type ContentLayout } from './content-layout';

export type GitHubConfig = {
	owner: string;
	repo: string;
	branch: string;
	contentPath: string;
	contentLayout: ContentLayout;
};

export type GitHubFileMeta = {
	sha: string;
	path: string;
};

const GH_API = 'https://api.github.com';

function gitBranchRefGetUrl(cfg: GitHubConfig): string {
	return `${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`;
}

/** GitHub: GET używa /git/ref/, PATCH /git/refs/ — inaczej 404. */
function gitBranchRefUpdateUrl(cfg: GitHubConfig): string {
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
	return {
		owner,
		repo,
		branch,
		contentPath,
		contentLayout: parseContentLayout(config),
	};
}

function ghHeaders(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'OmniPress',
	};
}

export async function getGitHubFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
): Promise<GitHubFileMeta | null> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) return null;
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub GET ${res.status}: ${text.slice(0, 200)}`);
	}
	const json = (await res.json()) as { sha?: string; path?: string };
	if (!json.sha || !json.path) return null;
	return { sha: json.sha, path: json.path };
}

/** Pobiera plik binarny (PDF, obraz) z repozytorium. */
export async function getGitHubFileBinary(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
): Promise<ArrayBuffer | null> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) return null;
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub GET ${res.status}: ${text.slice(0, 200)}`);
	}
	const json = (await res.json()) as { content?: string; encoding?: string };
	if (json.encoding !== 'base64' || !json.content) return null;
	const bytes = Buffer.from(json.content.replace(/\n/g, ''), 'base64');
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Odczyt treści pliku tekstowego/JSON z repozytorium (Contents API, base64). */
export async function getGitHubFileText(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
): Promise<string | null> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) return null;
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub GET ${res.status}: ${text.slice(0, 200)}`);
	}
	const json = (await res.json()) as { content?: string; encoding?: string };
	if (json.encoding !== 'base64' || !json.content) return null;
	return Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

export async function deleteGitHubFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	message: string,
): Promise<{ commitSha: string } | null> {
	const existing = await getGitHubFile(cfg, token, filePath);
	if (!existing) return null;

	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}`;
	const res = await fetch(url, {
		method: 'DELETE',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify({
			message,
			sha: existing.sha,
			branch: cfg.branch,
		}),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`GitHub DELETE ${res.status}: ${text.slice(0, 300)}`);
	}
	const json = JSON.parse(text) as { commit?: { sha?: string } };
	return { commitSha: json.commit?.sha ?? existing.sha };
}

/** Usuwa wiele plików w jednym commicie (jeden deploy Vercel). */
export async function deleteGitHubFilesBatch(
	cfg: GitHubConfig,
	token: string,
	filePaths: string[],
	message: string,
): Promise<{ commitSha: string; deleted: number } | null> {
	const paths = [...new Set(filePaths.map((p) => p.trim()).filter(Boolean))];
	if (paths.length === 0) return null;

	const existing: string[] = [];
	for (const path of paths) {
		const meta = await getGitHubFile(cfg, token, path);
		if (meta) existing.push(path);
	}
	if (existing.length === 0) return null;

	const refRes = await fetch(gitBranchRefGetUrl(cfg), { headers: ghHeaders(token) });
	if (!refRes.ok) {
		const text = await refRes.text();
		throw new Error(`GitHub ref GET ${refRes.status}: ${text.slice(0, 200)}`);
	}
	const refJson = (await refRes.json()) as { object: { sha: string } };
	const parentSha = refJson.object.sha;

	const commitRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/commits/${parentSha}`, {
		headers: ghHeaders(token),
	});
	if (!commitRes.ok) {
		const text = await commitRes.text();
		throw new Error(`GitHub commit ${commitRes.status}: ${text.slice(0, 200)}`);
	}
	const commitJson = (await commitRes.json()) as { tree: { sha: string } };

	const treeRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
		method: 'POST',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify({
			base_tree: commitJson.tree.sha,
			tree: existing.map((path) => ({ path, mode: '100644', sha: null })),
		}),
	});
	if (!treeRes.ok) {
		const text = await treeRes.text();
		throw new Error(`GitHub tree ${treeRes.status}: ${text.slice(0, 300)}`);
	}
	const treeJson = (await treeRes.json()) as { sha: string };

	const newCommitRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/commits`, {
		method: 'POST',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify({
			message,
			tree: treeJson.sha,
			parents: [parentSha],
		}),
	});
	if (!newCommitRes.ok) {
		const text = await newCommitRes.text();
		throw new Error(`GitHub commit POST ${newCommitRes.status}: ${text.slice(0, 300)}`);
	}
	const newCommitJson = (await newCommitRes.json()) as { sha: string };

	const updateRefRes = await fetch(gitBranchRefUpdateUrl(cfg), {
		method: 'PATCH',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify({ sha: newCommitJson.sha, force: false }),
	});
	if (!updateRefRes.ok) {
		const text = await updateRefRes.text();
		throw new Error(`GitHub ref PATCH ${updateRefRes.status}: ${text.slice(0, 300)}`);
	}

	return { commitSha: newCommitJson.sha, deleted: existing.length };
}

export async function putGitHubFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	content: string | ArrayBuffer,
	message: string,
	existingSha?: string,
): Promise<{ sha: string; commitSha: string }> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}`;
	const encoded =
		typeof content === 'string' ? textToBase64(content) : bytesToBase64(content);

	let sha = existingSha;
	if (!sha) {
		const existing = await getGitHubFile(cfg, token, filePath);
		sha = existing?.sha;
	}

	const body: Record<string, string> = {
		message,
		content: encoded,
		branch: cfg.branch,
	};
	if (sha) body.sha = sha;

	const res = await fetch(url, {
		method: 'PUT',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`GitHub PUT ${res.status}: ${text.slice(0, 300)}`);
	}
	const json = JSON.parse(text) as { content?: { sha?: string }; commit?: { sha?: string } };
	const contentSha = json.content?.sha ?? sha ?? '';
	const commitSha = json.commit?.sha ?? contentSha;
	return { sha: contentSha, commitSha };
}

export function isGitHubRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 403;
}

export function httpStatusFromError(message: string): number | null {
	const m = message.match(/GitHub (?:GET|PUT) (\d+)/);
	return m ? Number(m[1]) : null;
}

export async function listGitHubTreeBlobPaths(cfg: GitHubConfig, token: string): Promise<string[]> {
	const refRes = await fetch(gitBranchRefGetUrl(cfg), { headers: ghHeaders(token) });
	if (!refRes.ok) {
		const text = await refRes.text();
		throw new Error(`GitHub ref GET ${refRes.status}: ${text.slice(0, 200)}`);
	}
	const refJson = (await refRes.json()) as { object: { sha: string } };

	const commitRes = await fetch(
		`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/commits/${refJson.object.sha}`,
		{ headers: ghHeaders(token) },
	);
	if (!commitRes.ok) {
		const text = await commitRes.text();
		throw new Error(`GitHub commit ${commitRes.status}: ${text.slice(0, 200)}`);
	}
	const commitJson = (await commitRes.json()) as { tree: { sha: string } };

	const treeRes = await fetch(
		`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees/${commitJson.tree.sha}?recursive=1`,
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

export async function probeGitHubRepository(
	cfg: GitHubConfig,
	token: string,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.ok) return { ok: true };
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

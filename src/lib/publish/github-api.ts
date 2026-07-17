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

function isBinaryFileWrite(file: GitHubFileWrite): file is GitHubBinaryFileWrite {
	return typeof file.content !== 'string';
}

function binaryToArrayBuffer(content: ArrayBuffer | Uint8Array): ArrayBuffer {
	if (content instanceof ArrayBuffer) return content;
	return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
}

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
	const json = (await res.json()) as {
		content?: string;
		encoding?: string;
		download_url?: string;
	};
	if (json.encoding === 'base64' && json.content) {
		const bytes = Buffer.from(json.content.replace(/\n/g, ''), 'base64');
		return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	}
	// GitHub Contents API: pliki >1 MB zwracają encoding "none" + download_url
	if (json.download_url) {
		const blobRes = await fetch(json.download_url, { headers: ghHeaders(token) });
		if (!blobRes.ok) return null;
		return blobRes.arrayBuffer();
	}
	return null;
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

async function getBranchHeadCommitSha(cfg: GitHubConfig, token: string): Promise<string> {
	const refRes = await fetch(gitBranchRefGetUrl(cfg), { headers: ghHeaders(token) });
	if (!refRes.ok) {
		const text = await refRes.text();
		throw new Error(`GitHub ref GET ${refRes.status}: ${text.slice(0, 200)}`);
	}
	const refJson = (await refRes.json()) as { object: { sha: string } };
	return refJson.object.sha;
}

async function getCommitTreeSha(cfg: GitHubConfig, token: string, commitSha: string): Promise<string> {
	const commitRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/commits/${commitSha}`, {
		headers: ghHeaders(token),
	});
	if (!commitRes.ok) {
		const text = await commitRes.text();
		throw new Error(`GitHub commit ${commitRes.status}: ${text.slice(0, 200)}`);
	}
	const commitJson = (await commitRes.json()) as { tree: { sha: string } };
	return commitJson.tree.sha;
}

/** SHA bloba pliku na GitHub (Contents API — bez dekodowania treści). */
export async function getGitHubFileBlobSha(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
): Promise<string | null> {
	const meta = await getGitHubFile(cfg, token, filePath);
	return meta?.sha ?? null;
}

/** Contents API + base64 w JSON jest ciężki dla dużych plików — powyżej progu Git Data API. */
const LARGE_FILE_GIT_DATA_BYTES = 8 * 1024 * 1024;
/** Konflikty SHA przy równoległej publikacji (Contents API 409 / ref tip) — odśwież i ponów. */
const CONTENTS_CONFLICT_RETRIES = 4;

type GitHubTreeWriteEntry = {
	path: string;
	mode: '100644';
	type: 'blob';
	sha: string;
};

type GitHubTreeDeleteEntry = {
	path: string;
	mode: '100644';
	type: 'blob';
	sha: null;
};

async function createGitBlob(
	cfg: GitHubConfig,
	token: string,
	file: GitHubFileWrite,
): Promise<{ path: string; sha: string }> {
	const path = file.path.trim();
	const body = isBinaryFileWrite(file)
		? {
				content: bytesToBase64(binaryToArrayBuffer(file.content)),
				encoding: 'base64' as const,
			}
		: { content: file.content, encoding: 'utf-8' as const };

	const blobRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/blobs`, {
		method: 'POST',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!blobRes.ok) {
		const text = await blobRes.text();
		throw new Error(`GitHub blob ${blobRes.status}: ${text.slice(0, 300)}`);
	}
	const blobJson = (await blobRes.json()) as { sha: string };
	return { path, sha: blobJson.sha };
}

/**
 * Zapisuje wiele plików (tekst + binaria) w jednym commicie — jeden deploy Vercel.
 * Opcjonalnie usuwa ścieżki w tym samym tree (np. stary folder po zmianie slug).
 */
export async function putGitHubFilesBatch(
	cfg: GitHubConfig,
	token: string,
	files: GitHubFileWrite[],
	message: string,
	options: { deletes?: string[] } = {},
): Promise<{ commitSha: string; written: number; deleted: number; blobShas: Record<string, string> }> {
	const byPath = new Map<string, GitHubFileWrite>();
	for (const file of files) {
		const path = file.path.trim();
		if (!path) continue;
		byPath.set(path, { ...file, path });
	}
	const deletePaths = [
		...new Set((options.deletes ?? []).map((p) => p.trim()).filter(Boolean)),
	].filter((path) => !byPath.has(path));

	if (byPath.size === 0 && deletePaths.length === 0) {
		throw new Error('putGitHubFilesBatch: brak plików');
	}

	const blobShas: Record<string, string> = {};
	const writeEntries: GitHubTreeWriteEntry[] = [];
	if (byPath.size > 0) {
		const blobs = await Promise.all(
			[...byPath.values()].map((file) => createGitBlob(cfg, token, file)),
		);
		for (const { path, sha } of blobs) {
			blobShas[path] = sha;
			writeEntries.push({ path, mode: '100644', type: 'blob', sha });
		}
	}

	const deleteEntries: GitHubTreeDeleteEntry[] = deletePaths.map((path) => ({
		path,
		mode: '100644',
		type: 'blob',
		sha: null,
	}));

	let lastError = '';
	for (let attempt = 0; attempt < CONTENTS_CONFLICT_RETRIES; attempt++) {
		const parentSha = await getBranchHeadCommitSha(cfg, token);
		const baseTreeSha = await getCommitTreeSha(cfg, token, parentSha);
		const tree = [...writeEntries, ...deleteEntries];

		const treeRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
			method: 'POST',
			headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
			body: JSON.stringify({ base_tree: baseTreeSha, tree }),
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
		if (updateRefRes.ok) {
			return {
				commitSha: newCommitJson.sha,
				written: byPath.size,
				deleted: deletePaths.length,
				blobShas,
			};
		}
		const text = await updateRefRes.text();
		lastError = `GitHub ref PATCH ${updateRefRes.status}: ${text.slice(0, 300)}`;
		if (
			(updateRefRes.status === 409 || updateRefRes.status === 422) &&
			attempt < CONTENTS_CONFLICT_RETRIES - 1
		) {
			continue;
		}
		throw new Error(lastError);
	}

	throw new Error(lastError || 'GitHub ref PATCH: konflikt tipu gałęzi');
}

async function putGitHubFileViaGitData(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	content: string | ArrayBuffer,
	message: string,
): Promise<{ sha: string; commitSha: string }> {
	const encoded =
		typeof content === 'string' ? textToBase64(content) : bytesToBase64(content);

	const blobRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/blobs`, {
		method: 'POST',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify({ content: encoded, encoding: 'base64' }),
	});
	if (!blobRes.ok) {
		const text = await blobRes.text();
		throw new Error(`GitHub blob ${blobRes.status}: ${text.slice(0, 300)}`);
	}
	const blobJson = (await blobRes.json()) as { sha: string };

	let lastError = '';
	for (let attempt = 0; attempt < CONTENTS_CONFLICT_RETRIES; attempt++) {
		const parentSha = await getBranchHeadCommitSha(cfg, token);
		const baseTreeSha = await getCommitTreeSha(cfg, token, parentSha);

		const treeRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
			method: 'POST',
			headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
			body: JSON.stringify({
				base_tree: baseTreeSha,
				tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blobJson.sha }],
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
		if (updateRefRes.ok) {
			return { sha: blobJson.sha, commitSha: newCommitJson.sha };
		}
		const text = await updateRefRes.text();
		lastError = `GitHub ref PATCH ${updateRefRes.status}: ${text.slice(0, 300)}`;
		if (
			(updateRefRes.status === 409 || updateRefRes.status === 422) &&
			attempt < CONTENTS_CONFLICT_RETRIES - 1
		) {
			continue;
		}
		throw new Error(lastError);
	}

	throw new Error(lastError || 'GitHub ref PATCH: konflikt tipu gałęzi');
}

export async function putGitHubFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	content: string | ArrayBuffer,
	message: string,
	existingSha?: string,
): Promise<{ sha: string; commitSha: string }> {
	const byteLength =
		typeof content === 'string' ? new TextEncoder().encode(content).byteLength : content.byteLength;

	if (byteLength >= LARGE_FILE_GIT_DATA_BYTES) {
		return putGitHubFileViaGitData(cfg, token, filePath, content, message);
	}

	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}`;
	const encoded =
		typeof content === 'string' ? textToBase64(content) : bytesToBase64(content);

	let sha = existingSha;
	let lastError = '';

	for (let attempt = 0; attempt < CONTENTS_CONFLICT_RETRIES; attempt++) {
		if (attempt > 0 || !sha) {
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
		if (res.ok) {
			const json = JSON.parse(text) as { content?: { sha?: string }; commit?: { sha?: string } };
			const contentSha = json.content?.sha ?? sha ?? '';
			const commitSha = json.commit?.sha ?? contentSha;
			return { sha: contentSha, commitSha };
		}

		lastError = `GitHub PUT ${res.status}: ${text.slice(0, 300)}`;
		// 409 = tip / blob SHA się zmienił (równoległy commit); 422 bywa przy złym sha
		if ((res.status === 409 || res.status === 422) && attempt < CONTENTS_CONFLICT_RETRIES - 1) {
			sha = undefined;
			continue;
		}
		throw new Error(lastError);
	}

	throw new Error(lastError || 'GitHub PUT: konflikt SHA');
}

export function isGitHubRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 403 || status === 409;
}

export function httpStatusFromError(message: string): number | null {
	const m = message.match(
		/GitHub (?:GET|PUT|blob|tree|commit|ref|contents dir)(?:\sPOST|\sPATCH)? (\d+)/i,
	);
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

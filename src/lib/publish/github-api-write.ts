/** Zapis plików do repozytorium — Contents API dla małych, Git Data API dla dużych i wsadowych. */
import { encodeGitHubPath } from './paths';
import { bytesToBase64, textToBase64 } from './asset-model';
import {
	CONTENTS_CONFLICT_RETRIES,
	GH_API,
	LARGE_FILE_GIT_DATA_BYTES,
	binaryToArrayBuffer,
	ghJsonHeaders,
	isBinaryFileWrite,
	type GitHubConfig,
	type GitHubFileWrite,
} from './github-api-config';
import { commitTreeEntries, type GitHubTreeEntry } from './github-api-commit';
import { getGitHubFile } from './github-api-read';

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
		headers: ghJsonHeaders(token),
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
	const entries: GitHubTreeEntry[] = [];
	if (byPath.size > 0) {
		const blobs = await Promise.all(
			[...byPath.values()].map((file) => createGitBlob(cfg, token, file)),
		);
		for (const { path, sha } of blobs) {
			blobShas[path] = sha;
			entries.push({ path, mode: '100644', type: 'blob', sha });
		}
	}
	for (const path of deletePaths) {
		entries.push({ path, mode: '100644', type: 'blob', sha: null });
	}

	const { commitSha } = await commitTreeEntries(cfg, token, entries, message);
	return { commitSha, written: byPath.size, deleted: deletePaths.length, blobShas };
}

async function putGitHubFileViaGitData(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
	content: string | ArrayBuffer,
	message: string,
): Promise<{ sha: string; commitSha: string }> {
	const file: GitHubFileWrite =
		typeof content === 'string'
			? { path: filePath, content }
			: { path: filePath, content: new Uint8Array(content) };
	const { sha } = await createGitBlob(cfg, token, file);
	const { commitSha } = await commitTreeEntries(
		cfg,
		token,
		[{ path: filePath, mode: '100644', type: 'blob', sha }],
		message,
	);
	return { sha, commitSha };
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
	const encoded = typeof content === 'string' ? textToBase64(content) : bytesToBase64(content);

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
			headers: ghJsonHeaders(token),
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

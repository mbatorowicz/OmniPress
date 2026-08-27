/** Usuwanie plików z repozytorium — pojedynczo (Contents API) lub wsadowo w jednym commicie. */
import { encodeGitHubPath } from './paths';
import { GH_API, ghJsonHeaders, type GitHubConfig } from './github-api-config';
import { commitTreeEntries, type GitHubTreeEntry } from './github-api-commit';
import { getGitHubFile } from './github-api-read';

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
		headers: ghJsonHeaders(token),
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

	const entries: GitHubTreeEntry[] = existing.map((path) => ({
		path,
		mode: '100644',
		type: 'blob',
		sha: null,
	}));

	const { commitSha } = await commitTreeEntries(cfg, token, entries, message);
	return { commitSha, deleted: existing.length };
}

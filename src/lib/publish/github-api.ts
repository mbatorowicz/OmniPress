import { encodeGitHubPath } from './paths';
import { bytesToBase64, textToBase64 } from './assets';

export type GitHubConfig = {
	owner: string;
	repo: string;
	branch: string;
	contentPath: string;
};

export type GitHubFileMeta = {
	sha: string;
	path: string;
};

const GH_API = 'https://api.github.com';

export function parseGitHubRepoConfig(config: Record<string, unknown>): GitHubConfig | null {
	const repoRaw = config.repo;
	if (typeof repoRaw !== 'string' || !repoRaw.includes('/')) return null;
	const [owner, repo] = repoRaw.split('/', 2).map((s) => s.trim());
	if (!owner || !repo) return null;
	const branch =
		typeof config.branch === 'string' && config.branch.trim() ? config.branch.trim() : 'main';
	const contentPath =
		typeof config.content_path === 'string' && config.content_path.trim()
			? config.content_path.trim()
			: 'src/content';
	return { owner, repo, branch, contentPath };
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
	const body: Record<string, string> = {
		message,
		content: encoded,
		branch: cfg.branch,
	};
	if (existingSha) body.sha = existingSha;

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
	const sha = json.content?.sha ?? existingSha ?? '';
	const commitSha = json.commit?.sha ?? sha;
	return { sha, commitSha };
}

export function isGitHubRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 403;
}

export function httpStatusFromError(message: string): number | null {
	const m = message.match(/GitHub (?:GET|PUT) (\d+)/);
	return m ? Number(m[1]) : null;
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

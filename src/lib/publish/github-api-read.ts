/** Odczyt pojedynczych plików i wskaźników gałęzi (Contents API + Git Data API). */
import { encodeGitHubPath } from './paths';
import {
	GH_API,
	ghHeaders,
	gitBranchRefGetUrl,
	type GitHubConfig,
	type GitHubFileMeta,
} from './github-api-config';

function contentsUrl(cfg: GitHubConfig, filePath: string): string {
	return `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(cfg.branch)}`;
}

export async function getGitHubFile(
	cfg: GitHubConfig,
	token: string,
	filePath: string,
): Promise<GitHubFileMeta | null> {
	const res = await fetch(contentsUrl(cfg, filePath), { headers: ghHeaders(token) });
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
	const res = await fetch(contentsUrl(cfg, filePath), { headers: ghHeaders(token) });
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
	const res = await fetch(contentsUrl(cfg, filePath), { headers: ghHeaders(token) });
	if (res.status === 404) return null;
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub GET ${res.status}: ${text.slice(0, 200)}`);
	}
	const json = (await res.json()) as { content?: string; encoding?: string };
	if (json.encoding !== 'base64' || !json.content) return null;
	return Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8');
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

export async function getBranchHeadCommitSha(cfg: GitHubConfig, token: string): Promise<string> {
	const refRes = await fetch(gitBranchRefGetUrl(cfg), { headers: ghHeaders(token) });
	if (!refRes.ok) {
		const text = await refRes.text();
		throw new Error(`GitHub ref GET ${refRes.status}: ${text.slice(0, 200)}`);
	}
	const refJson = (await refRes.json()) as { object: { sha: string } };
	return refJson.object.sha;
}

export async function getCommitTreeSha(
	cfg: GitHubConfig,
	token: string,
	commitSha: string,
): Promise<string> {
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

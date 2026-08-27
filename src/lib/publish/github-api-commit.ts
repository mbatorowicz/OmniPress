/**
 * Jeden commit Git Data API: tree na bazie HEAD gałęzi → commit → PATCH refa.
 * Konflikt tipu (409/422) oznacza równoległą publikację — odświeżamy HEAD i ponawiamy.
 */
import {
	CONTENTS_CONFLICT_RETRIES,
	GH_API,
	ghJsonHeaders,
	gitBranchRefUpdateUrl,
	type GitHubConfig,
} from './github-api-config';
import { getBranchHeadCommitSha, getCommitTreeSha } from './github-api-read';

/** Wpis tree: `sha` bloba dla zapisu, `null` dla usunięcia ścieżki. */
export type GitHubTreeEntry = {
	path: string;
	mode: '100644';
	type: 'blob';
	sha: string | null;
};

export async function commitTreeEntries(
	cfg: GitHubConfig,
	token: string,
	entries: GitHubTreeEntry[],
	message: string,
): Promise<{ commitSha: string }> {
	let lastError = '';

	for (let attempt = 0; attempt < CONTENTS_CONFLICT_RETRIES; attempt++) {
		const parentSha = await getBranchHeadCommitSha(cfg, token);
		const baseTreeSha = await getCommitTreeSha(cfg, token, parentSha);

		const treeRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees`, {
			method: 'POST',
			headers: ghJsonHeaders(token),
			body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
		});
		if (!treeRes.ok) {
			const text = await treeRes.text();
			throw new Error(`GitHub tree ${treeRes.status}: ${text.slice(0, 300)}`);
		}
		const treeJson = (await treeRes.json()) as { sha: string };

		const newCommitRes = await fetch(`${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/commits`, {
			method: 'POST',
			headers: ghJsonHeaders(token),
			body: JSON.stringify({ message, tree: treeJson.sha, parents: [parentSha] }),
		});
		if (!newCommitRes.ok) {
			const text = await newCommitRes.text();
			throw new Error(`GitHub commit POST ${newCommitRes.status}: ${text.slice(0, 300)}`);
		}
		const newCommitJson = (await newCommitRes.json()) as { sha: string };

		const updateRefRes = await fetch(gitBranchRefUpdateUrl(cfg), {
			method: 'PATCH',
			headers: ghJsonHeaders(token),
			body: JSON.stringify({ sha: newCommitJson.sha, force: false }),
		});
		if (updateRefRes.ok) return { commitSha: newCommitJson.sha };

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

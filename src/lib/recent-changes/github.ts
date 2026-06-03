import {
	getGitHubFile,
	getGitHubFileText,
	putGitHubFile,
	type GitHubConfig,
} from '@/lib/publish/github-api';
import { buildRecentChangesPayload, parseRecentChangesFile } from './parse';
import type { RecentChangeEntry } from './types';
import { emptyRecentChangesFile, recentChangesPath } from './types';
import { upsertRecentChange } from './upsert';

export async function appendRecentChangeOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	entry: RecentChangeEntry,
): Promise<void> {
	const path = recentChangesPath(destinationConfig);
	const existing = await getGitHubFile(cfg, token, path);
	const text = existing ? await getGitHubFileText(cfg, token, path) : null;

	let file;
	try {
		file = text ? parseRecentChangesFile(text) : emptyRecentChangesFile();
	} catch {
		file = emptyRecentChangesFile();
	}

	file.entries = upsertRecentChange(file.entries, entry);

	await putGitHubFile(
		cfg,
		token,
		path,
		buildRecentChangesPayload(file),
		'OmniPress: rejestr ostatnich zmian',
		existing?.sha,
	);
}

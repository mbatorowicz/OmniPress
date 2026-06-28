import { layoutConfigPath } from '@/lib/admin/config-paths';
import {
	getGitHubFile,
	getGitHubFileBlobSha,
	getGitHubFileText,
	putGitHubFile,
	type GitHubConfig,
	type GitHubTextFileWrite,
} from '@/lib/publish/github-api';
import { buildLayoutFilePayload, parseLayoutFile } from '@/lib/astro-layout/parse';
import { hashLayoutFile } from '@/lib/astro-layout/layout-sync-meta.server';
import { upsertRecentChangeEntriesInLayout } from '@/lib/astro-layout/migrate-layout';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import { upsertRecentChange } from './upsert';
import type { RecentChangeEntry } from './types';

function layoutPayloadFromDraft(draft: SiteAstroLayout) {
	return parseLayoutFile(buildLayoutFilePayload(draft));
}

export async function prepareRecentChangeAppendWrite(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	entry: RecentChangeEntry,
	options: { draftLayout?: SiteAstroLayout } = {},
): Promise<GitHubTextFileWrite> {
	const path = layoutConfigPath(destinationConfig);
	const draft = options.draftLayout;
	const draftHash = draft ? hashLayoutFile(draft) : null;
	const inSyncWithDraft =
		draft &&
		draft.sync?.publishedLayoutHash &&
		draftHash === draft.sync.publishedLayoutHash;

	let layoutPayload;
	if (inSyncWithDraft && draft) {
		layoutPayload = layoutPayloadFromDraft(draft);
	} else {
		const existing = await getGitHubFile(cfg, token, path);
		const text = existing ? await getGitHubFileText(cfg, token, path) : null;
		try {
			layoutPayload = text
				? parseLayoutFile(text)
				: { categories: [], displays: {}, slots: [] };
		} catch {
			layoutPayload = { categories: [], displays: {}, slots: [] };
		}
	}

	const rcSlot = layoutPayload.slots.find((s) => s.component === 'sidebar.recent_changes');
	const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
	const slots = layoutPayload.slots.map((slot) =>
		slot.component === 'sidebar.recent_changes' ? { ...slot, entries } : slot,
	);

	const content = buildLayoutFilePayload({
		categories: layoutPayload.categories,
		categoryDisplays: layoutPayload.displays,
		slots,
		navigation: [],
		layoutPath: path,
		navigationPath: '',
		categoriesPath: '',
	});

	return { path, content };
}

export async function appendRecentChangeOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	entry: RecentChangeEntry,
	options: { draftLayout?: SiteAstroLayout } = {},
): Promise<void> {
	const prepared = await prepareRecentChangeAppendWrite(
		cfg,
		token,
		destinationConfig,
		entry,
		options,
	);
	const existing = await getGitHubFile(cfg, token, prepared.path);

	await putGitHubFile(
		cfg,
		token,
		prepared.path,
		prepared.content,
		'OmniPress: rejestr ostatnich zmian',
		existing?.sha,
	);
}

/** Aktualizuje blob SHA layoutu po zapisie RC (bez pełnego importu). */
export async function fetchLayoutBlobShaAfterWrite(
	cfg: GitHubConfig,
	token: string,
	layoutPath: string,
): Promise<string | null> {
	return getGitHubFileBlobSha(cfg, token, layoutPath);
}

export function appendRecentChangeToLayoutText(text: string, entry: RecentChangeEntry): string {
	const parsed = parseLayoutFile(text);
	const rcSlot = parsed.slots.find((s) => s.component === 'sidebar.recent_changes');
	const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);
	const layout = upsertRecentChangeEntriesInLayout(
		{
			categories: parsed.categories,
			categoryDisplays: parsed.displays,
			slots: parsed.slots,
			navigation: [],
			layoutPath: '',
			navigationPath: '',
			categoriesPath: '',
		},
		entries,
	);
	return buildLayoutFilePayload(layout);
}

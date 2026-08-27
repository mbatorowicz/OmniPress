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
import { emptyZones } from '@/lib/astro-layout/zones';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import { upsertRecentChange } from './upsert';
import type { RecentChangeEntry } from './types';

function layoutPayloadFromDraft(draft: SiteAstroLayout) {
	return parseLayoutFile(buildLayoutFilePayload(draft));
}

/**
 * Sklejenie layoutu do serializacji z parsowanego pliku. `zones` przechodzi bez zmian —
 * odtworzenie stref z płaskich slotów cofa komponent do strefy domyślnej, więc pogoda,
 * CERT albo baner przestawione do stopki wracałyby do sidebara przy każdym ogłoszeniu.
 */
function layoutFromPayload(
	payload: ReturnType<typeof parseLayoutFile>,
	layoutPath: string,
): SiteAstroLayout {
	return {
		categories: payload.categories,
		categoryDisplays: payload.displays,
		zones: payload.zones,
		slots: payload.slots,
		navigation: [],
		layoutPath,
		navigationPath: '',
		categoriesPath: '',
	};
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

	const emptyPayload = () => ({
		categories: [],
		displays: {},
		slots: [],
		zones: emptyZones(),
	});

	let layoutPayload: ReturnType<typeof parseLayoutFile>;
	if (inSyncWithDraft && draft) {
		layoutPayload = layoutPayloadFromDraft(draft);
	} else {
		const existing = await getGitHubFile(cfg, token, path);
		const text = existing ? await getGitHubFileText(cfg, token, path) : null;
		try {
			layoutPayload = text ? parseLayoutFile(text) : emptyPayload();
		} catch {
			layoutPayload = emptyPayload();
		}
	}

	const rcSlot = layoutPayload.slots.find((s) => s.component === 'sidebar.recent_changes');
	const entries = upsertRecentChange(rcSlot?.entries ?? [], entry);

	const content = buildLayoutFilePayload(
		upsertRecentChangeEntriesInLayout(layoutFromPayload(layoutPayload, path), entries),
	);

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
	const layout = upsertRecentChangeEntriesInLayout(layoutFromPayload(parsed, ''), entries);
	return buildLayoutFilePayload(layout);
}

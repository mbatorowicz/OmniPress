import { categoriesConfigPath, layoutConfigPath, navigationConfigPath } from '@/lib/admin/config-paths';
import {
	getGitHubFileBlobSha,
	getGitHubFileText,
} from '@/lib/publish/github-api';
import { parseRecentChangesFile } from '@/lib/recent-changes/parse';
import { recentChangesPath } from '@/lib/recent-changes/types';
import { hashLayoutFileText } from './layout-sync-meta.server';
import { mergeLegacyLayoutParts, syncNavigationInLayout } from './migrate-layout';
import {
	buildLayoutFilePayload,
	normalizeSiteAstroLayout,
	parseCategoriesFile,
	parseLayoutFile,
	parseNavigationJson,
} from './parse';
import type { LayoutContract, SiteAstroLayout } from './types';
import { collectNavHrefs } from './validate-nav';
import { migrateFlatSlotsToZones } from './zones';

export async function importLegacyLayoutFromGitHub(
	cfg: Parameters<typeof getGitHubFileText>[0],
	token: string,
	destConfig: Record<string, unknown>,
	layout: SiteAstroLayout,
): Promise<
	| { layout: SiteAstroLayout; layoutHash: string; liveBlobSha?: string; layoutContract: LayoutContract }
	| { error: string }
> {
	const navPath = navigationConfigPath(destConfig);
	const catPath = categoriesConfigPath(destConfig);
	const layoutPath = layoutConfigPath(destConfig);

	const layoutBlobSha = await getGitHubFileBlobSha(cfg, token, layoutPath);
	const layoutText = layoutBlobSha ? await getGitHubFileText(cfg, token, layoutPath) : null;
	if (layoutText) {
		try {
			const parsed = parseLayoutFile(layoutText);
			const merged: SiteAstroLayout = {
				...layout,
				categories: parsed.categories,
				categoryDisplays: parsed.displays,
				zones: parsed.zones,
				slots: parsed.slots,
				layoutPath,
			};
			const normalized = normalizeSiteAstroLayout(merged);
			const hash = hashLayoutFileText(layoutText) ?? '';
			return {
				layout: normalized,
				layoutHash: hash,
				liveBlobSha: layoutBlobSha ?? undefined,
				layoutContract: layoutText.includes('"zones"') ? 'zones_v2' : 'unified',
			};
		} catch {
			return { error: 'invalid_layout' };
		}
	}

	const navText = await getGitHubFileText(cfg, token, navPath);
	if (!navText) return { error: 'import_nav_missing' };

	let navigation;
	try {
		navigation = parseNavigationJson(navText);
	} catch {
		return { error: 'invalid_navigation' };
	}

	const hrefCount = collectNavHrefs(navigation).length;
	if (hrefCount === 0 && navText.includes('"href"')) {
		return { error: 'import_nav_empty' };
	}

	let categories = layout.categories;
	let displays = layout.categoryDisplays;
	let slots = layout.slots;

	const catText = await getGitHubFileText(cfg, token, catPath);
	if (catText) {
		try {
			const parsed = parseCategoriesFile(catText);
			categories = parsed.categories;
			displays = parsed.displays;
			slots = parsed.slots;
		} catch {
			return { error: 'invalid_layout' };
		}
	}

	let recentEntries = undefined;
	const rcText = await getGitHubFileText(cfg, token, recentChangesPath(destConfig));
	if (rcText) {
		try {
			recentEntries = parseRecentChangesFile(rcText).entries;
		} catch {
			// ignore broken recent changes file
		}
	}

	slots = mergeLegacyLayoutParts({
		categories,
		displays,
		slots,
		navigation,
		recentEntries,
	});

	const zones = migrateFlatSlotsToZones(slots);

	const merged = syncNavigationInLayout(
		{
			...layout,
			categories,
			categoryDisplays: displays,
			zones,
			slots,
			navigation,
			layoutPath,
		},
		navigation,
	);

	const normalized = normalizeSiteAstroLayout(merged);
	const hash = hashLayoutFileText(buildLayoutFilePayload(normalized)) ?? '';
	return { layout: normalized, layoutHash: hash, layoutContract: 'legacy' };
}

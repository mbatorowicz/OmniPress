import type { SupabaseClient } from '@supabase/supabase-js';
import { getDestinationById } from './destinations';
import { getSiteById, getSiteDestinations } from './sites';
import { normalizeGitHubRepo } from './github-repo';
import { DEFAULT_LAYOUT_PATH } from '@/lib/astro-layout/types';
import type { UnitFormInitial } from './unit-types';

export async function loadUnitFormInitial(
	supabase: SupabaseClient,
	siteId: string,
): Promise<UnitFormInitial | null> {
	const site = await getSiteById(supabase, siteId);
	if (!site) return null;

	const links = await getSiteDestinations(supabase, siteId);
	const astroLink = links.find((l) => l.destinations?.type === 'github_astro');

	let astro: UnitFormInitial['astro'];

	if (astroLink) {
		const dest = await getDestinationById(supabase, astroLink.destination_id);
		if (dest) {
			const cfg = dest.config as Record<string, string>;
			astro = {
				destinationId: dest.id,
				repo: normalizeGitHubRepo(String(cfg.repo ?? '')),
				branch: cfg.branch ?? 'main',
				content_path: cfg.content_path ?? 'src/content/news',
				content_layout: cfg.content_layout === 'folder' ? 'folder' : 'flat',
				layout_path:
					typeof cfg.layout_path === 'string' && cfg.layout_path.trim()
						? cfg.layout_path.trim()
						: DEFAULT_LAYOUT_PATH,
				categories_path:
					typeof cfg.categories_path === 'string' && cfg.categories_path.trim()
						? cfg.categories_path.trim()
						: 'src/config/omnipress-categories.json',
				navigation_path:
					typeof cfg.navigation_path === 'string' && cfg.navigation_path.trim()
						? cfg.navigation_path.trim()
						: 'src/config/omnipress-navigation.json',
				recent_changes_path:
					typeof cfg.recent_changes_path === 'string' && cfg.recent_changes_path.trim()
						? cfg.recent_changes_path.trim()
						: 'src/config/omnipress-recent-changes.json',
				vercel_project_id: String(cfg.vercel_project_id ?? '').trim(),
				vercel_team_id: String(cfg.vercel_team_id ?? '').trim(),
			};
		}
	}

	return {
		siteId: site.id,
		name: site.name,
		slug: site.slug,
		is_active: site.is_active,
		enableAstro: Boolean(astro),
		astro,
	};
}

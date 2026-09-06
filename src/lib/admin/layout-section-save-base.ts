import type { SupabaseClient } from '@supabase/supabase-js';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';

export type SectionSaveBase =
	| { ok: true; layout: SiteAstroLayout }
	| { ok: false; error: string };

/** Zapis kategorii zawsze startuje od pliku na GitHub — inaczej stary szkic nadpisuje menu. */
export async function resolveLayoutBaseForSectionSave(
	supabase: SupabaseClient,
	siteId: string,
	existing: SiteAstroLayout,
	section: string,
): Promise<SectionSaveBase> {
	if (section !== 'categories') return { ok: true, layout: existing };

	const imported = await importSiteAstroLayoutFromGitHub(supabase, siteId, { persist: false });
	if (!imported.ok) return { ok: false, error: imported.error };
	return { ok: true, layout: imported.layout };
}

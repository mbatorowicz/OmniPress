import type { SupabaseClient } from '@supabase/supabase-js';
import {
	buildConfig,
	encryptCredentialsFromForm,
	getDestinationById,
	validateDestinationConfig,
} from './destinations';
import { getSiteById, getSiteDestinations } from './sites';
import { isValidSlug, normalizeSlug } from './slug';
import { normalizeGitHubRepo } from './github-repo';
import { syncSiteDestinations } from './user-sites';

export type UnitError =
	| 'invalid_slug'
	| 'name_required'
	| 'no_channel'
	| 'config_repo'
	| 'site_failed'
	| 'destination_failed'
	| 'mapping_failed'
	| 'not_found';

export type UnitResult = { ok: true; siteId: string } | { ok: false; error: UnitError };

export type UnitFormInitial = {
	siteId: string;
	name: string;
	slug: string;
	is_active: boolean;
	enableAstro: boolean;
	astro?: {
		destinationId: string;
		repo: string;
		branch: string;
		content_path: string;
		content_layout: 'flat' | 'folder';
		categories_path: string;
	};
};

function formFlag(form: FormData, key: string): boolean {
	return form.get(key) === 'on';
}

async function upsertDestination(
	supabase: SupabaseClient,
	opts: {
		id: string | null;
		name: string;
		config: Record<string, unknown>;
		credentials: FormData;
	},
): Promise<{ id: string } | null> {
	const encrypted = await encryptCredentialsFromForm('github_astro', opts.credentials);
	const row: Record<string, unknown> = {
		name: opts.name,
		type: 'github_astro',
		config: opts.config,
		is_active: true,
	};
	if (encrypted) row.encrypted_credentials = encrypted;

	if (opts.id) {
		const { error } = await supabase.from('destinations').update(row).eq('id', opts.id);
		return error ? null : { id: opts.id };
	}

	const { data, error } = await supabase.from('destinations').insert(row).select('id').single();
	if (error || !data) return null;
	return { id: data.id as string };
}

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
				categories_path:
					typeof cfg.categories_path === 'string' && cfg.categories_path.trim()
						? cfg.categories_path.trim()
						: 'src/config/omnipress-categories.json',
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

function validateUnitForm(form: FormData): UnitError | null {
	const unitName = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? unitName));
	const enableAstro = formFlag(form, 'enable_astro');

	if (!unitName) return 'name_required';
	if (!isValidSlug(slug)) return 'invalid_slug';
	if (!enableAstro) return 'no_channel';

	const err = validateDestinationConfig('github_astro', buildConfig('github_astro', form));
	if (err) return err;
	return null;
}

export async function createOrganizationalUnit(
	supabase: SupabaseClient,
	form: FormData,
): Promise<UnitResult> {
	const validation = validateUnitForm(form);
	if (validation) return { ok: false, error: validation };

	const unitName = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? unitName));
	const is_active = form.get('is_active') === 'on';

	const { data: site, error: siteError } = await supabase
		.from('sites')
		.insert({ name: unitName, slug, is_active })
		.select('id')
		.single();

	if (siteError || !site) return { ok: false, error: 'site_failed' };
	const siteId = site.id as string;
	const createdDestIds: string[] = [];

	try {
		const credForm = new FormData();
		credForm.set('github_token', String(form.get('github_token') ?? ''));

		const dest = await upsertDestination(supabase, {
			id: null,
			name: `${unitName} — Astro`,
			config: buildConfig('github_astro', form),
			credentials: credForm,
		});
		if (!dest) throw new Error('destination_failed');
		createdDestIds.push(dest.id);

		const mapped = await syncSiteDestinations(supabase, siteId, [
			{ destination_id: dest.id, is_default: true },
		]);
		if (!mapped.ok) throw new Error('mapping_failed');

		return { ok: true, siteId };
	} catch (e) {
		const errCode =
			e instanceof Error && e.message === 'mapping_failed' ? 'mapping_failed' : 'destination_failed';
		if (createdDestIds.length) {
			await supabase.from('site_destinations').delete().eq('site_id', siteId);
			await supabase.from('destinations').delete().in('id', createdDestIds);
		}
		await supabase.from('sites').delete().eq('id', siteId);
		return { ok: false, error: errCode };
	}
}

export async function updateOrganizationalUnit(
	supabase: SupabaseClient,
	siteId: string,
	form: FormData,
): Promise<UnitResult> {
	const existing = await loadUnitFormInitial(supabase, siteId);
	if (!existing) return { ok: false, error: 'not_found' };

	const validation = validateUnitForm(form);
	if (validation) return { ok: false, error: validation };

	const unitName = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? unitName));
	const is_active = form.get('is_active') === 'on';

	const { error: siteError } = await supabase
		.from('sites')
		.update({ name: unitName, slug, is_active })
		.eq('id', siteId);

	if (siteError) return { ok: false, error: 'site_failed' };

	const astroId =
		String(form.get('astro_destination_id') ?? existing.astro?.destinationId ?? '') || null;

	const credForm = new FormData();
	credForm.set('github_token', String(form.get('github_token') ?? ''));

	const dest = await upsertDestination(supabase, {
		id: astroId,
		name: `${unitName} — Astro`,
		config: buildConfig('github_astro', form),
		credentials: credForm,
	});
	if (!dest) return { ok: false, error: 'destination_failed' };

	const mapped = await syncSiteDestinations(supabase, siteId, [
		{ destination_id: dest.id, is_default: true },
	]);
	if (!mapped.ok) return { ok: false, error: 'mapping_failed' };

	return { ok: true, siteId };
}

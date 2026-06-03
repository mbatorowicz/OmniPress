import type { SupabaseClient } from '@supabase/supabase-js';
import {
	buildConfig,
	encryptCredentialsFromForm,
	getDestinationById,
	validateDestinationConfig,
} from './destinations';
import { getSiteById, getSiteDestinations } from './sites';
import { isValidSlug, normalizeSlug } from './slug';
import { wordpressSiteDisplayUrl } from './wordpress-url';
import { syncSiteDestinations } from './user-sites';

export type UnitError =
	| 'invalid_slug'
	| 'name_required'
	| 'no_channel'
	| 'config_wp_rest_base'
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
	enableWordpress: boolean;
	enableAstro: boolean;
	defaultChannel: 'wordpress' | 'github_astro';
	wp?: {
		destinationId: string;
		wp_site_url: string;
	};
	astro?: {
		destinationId: string;
		repo: string;
		branch: string;
		content_path: string;
	};
};

function formFlag(form: FormData, key: string): boolean {
	return form.get(key) === 'on';
}

function credentialSlice(form: FormData, type: 'wordpress' | 'github_astro'): FormData {
	const out = new FormData();
	if (type === 'wordpress') {
		out.set('wp_username', String(form.get('wp_username') ?? ''));
		out.set('wp_app_password', String(form.get('wp_app_password') ?? ''));
	} else {
		out.set('github_token', String(form.get('github_token') ?? ''));
	}
	return out;
}

function defaultLinks(
	enableWp: boolean,
	wpId: string | null,
	enableAstro: boolean,
	astroId: string | null,
	form: FormData,
): { destination_id: string; is_default: boolean }[] {
	const defaultChannel = String(form.get('default_channel') ?? 'wordpress');
	const preferAstro = enableAstro && (!enableWp || defaultChannel === 'github_astro');
	const links: { destination_id: string; is_default: boolean }[] = [];
	if (wpId) links.push({ destination_id: wpId, is_default: !preferAstro });
	if (astroId) links.push({ destination_id: astroId, is_default: preferAstro });
	return links;
}

async function upsertDestination(
	supabase: SupabaseClient,
	opts: {
		id: string | null;
		name: string;
		type: 'wordpress' | 'github_astro';
		config: Record<string, unknown>;
		credentials: FormData;
	},
): Promise<{ id: string } | null> {
	const encrypted = await encryptCredentialsFromForm(opts.type, opts.credentials);
	const row: Record<string, unknown> = {
		name: opts.name,
		type: opts.type,
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
	const wpLink = links.find((l) => l.destinations?.type === 'wordpress');
	const astroLink = links.find((l) => l.destinations?.type === 'github_astro');

	let wp: UnitFormInitial['wp'];
	let astro: UnitFormInitial['astro'];

	if (wpLink) {
		const dest = await getDestinationById(supabase, wpLink.destination_id);
		if (dest) {
			const cfg = dest.config as Record<string, string>;
			wp = {
				destinationId: dest.id,
				wp_site_url: wordpressSiteDisplayUrl(cfg),
			};
		}
	}

	if (astroLink) {
		const dest = await getDestinationById(supabase, astroLink.destination_id);
		if (dest) {
			const cfg = dest.config as Record<string, string>;
			astro = {
				destinationId: dest.id,
				repo: cfg.repo ?? '',
				branch: cfg.branch ?? 'main',
				content_path: cfg.content_path ?? 'src/content',
			};
		}
	}

	const defaultChannel =
		astroLink?.is_default && astro ? 'github_astro' : 'wordpress';

	return {
		siteId: site.id,
		name: site.name,
		slug: site.slug,
		is_active: site.is_active,
		enableWordpress: Boolean(wp),
		enableAstro: Boolean(astro),
		defaultChannel,
		wp,
		astro,
	};
}

function validateUnitForm(form: FormData): UnitError | null {
	const unitName = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? unitName));
	const enableWp = formFlag(form, 'enable_wordpress');
	const enableAstro = formFlag(form, 'enable_astro');

	if (!unitName) return 'name_required';
	if (!isValidSlug(slug)) return 'invalid_slug';
	if (!enableWp && !enableAstro) return 'no_channel';

	if (enableWp) {
		const err = validateDestinationConfig('wordpress', buildConfig('wordpress', form));
		if (err) return err;
	}
	if (enableAstro) {
		const err = validateDestinationConfig('github_astro', buildConfig('github_astro', form));
		if (err) return err;
	}
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
	const enableWp = formFlag(form, 'enable_wordpress');
	const enableAstro = formFlag(form, 'enable_astro');

	const { data: site, error: siteError } = await supabase
		.from('sites')
		.insert({ name: unitName, slug, is_active })
		.select('id')
		.single();

	if (siteError || !site) return { ok: false, error: 'site_failed' };
	const siteId = site.id as string;
	const createdDestIds: string[] = [];

	try {
		let wpId: string | null = null;
		let astroId: string | null = null;

		if (enableWp) {
			const dest = await upsertDestination(supabase, {
				id: null,
				name: `${unitName} — WordPress`,
				type: 'wordpress',
				config: buildConfig('wordpress', form),
				credentials: credentialSlice(form, 'wordpress'),
			});
			if (!dest) throw new Error('destination_failed');
			wpId = dest.id;
			createdDestIds.push(dest.id);
		}

		if (enableAstro) {
			const dest = await upsertDestination(supabase, {
				id: null,
				name: `${unitName} — Astro`,
				type: 'github_astro',
				config: buildConfig('github_astro', form),
				credentials: credentialSlice(form, 'github_astro'),
			});
			if (!dest) throw new Error('destination_failed');
			astroId = dest.id;
			createdDestIds.push(dest.id);
		}

		const mapped = await syncSiteDestinations(
			supabase,
			siteId,
			defaultLinks(enableWp, wpId, enableAstro, astroId, form),
		);
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
	const enableWp = formFlag(form, 'enable_wordpress');
	const enableAstro = formFlag(form, 'enable_astro');

	const { error: siteError } = await supabase
		.from('sites')
		.update({ name: unitName, slug, is_active })
		.eq('id', siteId);

	if (siteError) return { ok: false, error: 'site_failed' };

	let wpId: string | null = enableWp
		? String(form.get('wp_destination_id') ?? existing.wp?.destinationId ?? '') || null
		: null;
	let astroId: string | null = enableAstro
		? String(form.get('astro_destination_id') ?? existing.astro?.destinationId ?? '') || null
		: null;

	if (enableWp) {
		const dest = await upsertDestination(supabase, {
			id: wpId,
			name: `${unitName} — WordPress`,
			type: 'wordpress',
			config: buildConfig('wordpress', form),
			credentials: credentialSlice(form, 'wordpress'),
		});
		if (!dest) return { ok: false, error: 'destination_failed' };
		wpId = dest.id;
	}

	if (enableAstro) {
		const dest = await upsertDestination(supabase, {
			id: astroId,
			name: `${unitName} — Astro`,
			type: 'github_astro',
			config: buildConfig('github_astro', form),
			credentials: credentialSlice(form, 'github_astro'),
		});
		if (!dest) return { ok: false, error: 'destination_failed' };
		astroId = dest.id;
	}

	const mapped = await syncSiteDestinations(
		supabase,
		siteId,
		defaultLinks(enableWp, wpId, enableAstro, astroId, form),
	);
	if (!mapped.ok) return { ok: false, error: 'mapping_failed' };

	return { ok: true, siteId };
}

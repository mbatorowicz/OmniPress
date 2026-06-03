import type { SupabaseClient } from '@supabase/supabase-js';
import {
	buildConfig,
	encryptCredentialsFromForm,
	validateDestinationConfig,
} from './destinations';
import { isValidSlug, normalizeSlug } from './slug';
import { syncSiteDestinations } from './user-sites';

export type CreateUnitError =
	| 'invalid_slug'
	| 'name_required'
	| 'no_channel'
	| 'config_wp_rest_base'
	| 'config_repo'
	| 'site_failed'
	| 'destination_failed'
	| 'mapping_failed';

export type CreateUnitResult =
	| { ok: true; siteId: string }
	| { ok: false; error: CreateUnitError };

function formFlag(form: FormData, key: string): boolean {
	return form.get(key) === 'on';
}

function syntheticForm(entries: Record<string, string>): FormData {
	const form = new FormData();
	for (const [k, v] of Object.entries(entries)) form.set(k, v);
	return form;
}

async function insertDestination(
	supabase: SupabaseClient,
	name: string,
	type: 'wordpress' | 'github_astro',
	config: Record<string, unknown>,
	credentialForm: FormData,
): Promise<{ id: string } | null> {
	const row: Record<string, unknown> = { name, type, config, is_active: true };
	const encrypted = await encryptCredentialsFromForm(type, credentialForm);
	if (encrypted) row.encrypted_credentials = encrypted;

	const { data, error } = await supabase.from('destinations').insert(row).select('id').single();
	if (error || !data) return null;
	return { id: data.id as string };
}

export async function createOrganizationalUnit(
	supabase: SupabaseClient,
	form: FormData,
): Promise<CreateUnitResult> {
	const unitName = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? unitName));
	const is_active = form.get('is_active') === 'on';
	const enableWp = formFlag(form, 'enable_wordpress');
	const enableAstro = formFlag(form, 'enable_astro');

	if (!unitName) return { ok: false, error: 'name_required' };
	if (!isValidSlug(slug)) return { ok: false, error: 'invalid_slug' };
	if (!enableWp && !enableAstro) return { ok: false, error: 'no_channel' };

	if (enableWp) {
		const wpConfig = buildConfig('wordpress', form);
		const err = validateDestinationConfig('wordpress', wpConfig);
		if (err) return { ok: false, error: err };
	}
	if (enableAstro) {
		const astroConfig = buildConfig('github_astro', form);
		const err = validateDestinationConfig('github_astro', astroConfig);
		if (err) return { ok: false, error: err };
	}

	const { data: site, error: siteError } = await supabase
		.from('sites')
		.insert({ name: unitName, slug, is_active })
		.select('id')
		.single();

	if (siteError || !site) return { ok: false, error: 'site_failed' };
	const siteId = site.id as string;
	const createdDestIds: string[] = [];

	try {
		let wpDestId: string | null = null;
		let astroDestId: string | null = null;

		if (enableWp) {
			const wpConfig = buildConfig('wordpress', form);
			const wpCreds = syntheticForm({
				wp_username: String(form.get('wp_username') ?? ''),
				wp_app_password: String(form.get('wp_app_password') ?? ''),
			});
			const dest = await insertDestination(
				supabase,
				`${unitName} — WordPress`,
				'wordpress',
				wpConfig,
				wpCreds,
			);
			if (!dest) throw new Error('destination_failed');
			wpDestId = dest.id;
			createdDestIds.push(dest.id);
		}

		if (enableAstro) {
			const astroConfig = buildConfig('github_astro', form);
			const ghCreds = syntheticForm({
				github_token: String(form.get('github_token') ?? ''),
			});
			const dest = await insertDestination(
				supabase,
				`${unitName} — Astro`,
				'github_astro',
				astroConfig,
				ghCreds,
			);
			if (!dest) throw new Error('destination_failed');
			astroDestId = dest.id;
			createdDestIds.push(dest.id);
		}

		const defaultChannel = String(form.get('default_channel') ?? 'wordpress');
		const preferAstro = enableAstro && (!enableWp || defaultChannel === 'github_astro');
		const links: { destination_id: string; is_default: boolean }[] = [];
		if (wpDestId) {
			links.push({ destination_id: wpDestId, is_default: !preferAstro });
		}
		if (astroDestId) {
			links.push({ destination_id: astroDestId, is_default: preferAstro });
		}

		const mapped = await syncSiteDestinations(supabase, siteId, links);
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
		return { ok: false, error: errCode as CreateUnitError };
	}
}

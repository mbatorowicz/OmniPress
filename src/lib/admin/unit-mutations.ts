import type { SupabaseClient } from '@supabase/supabase-js';
import { buildConfig, validateDestinationConfig } from './destinations';
import { isValidSlug, normalizeSlug } from './slug';
import { syncSiteDestinations } from './user-sites';
import { formFlag, upsertDestination } from './unit-destination';
import { loadUnitFormInitial } from './unit-load';
import type { UnitError, UnitResult } from './unit-types';

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
		credForm.set('vercel_token', String(form.get('vercel_token') ?? ''));

		const dest = await upsertDestination(supabase, {
			id: null,
			name: `${unitName}`,
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
	credForm.set('vercel_token', String(form.get('vercel_token') ?? ''));

	const dest = await upsertDestination(supabase, {
		id: astroId,
		name: `${unitName}`,
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

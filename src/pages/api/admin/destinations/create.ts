import type { APIRoute } from 'astro';
import {
	buildConfig,
	encryptCredentialsFromForm,
	parseDestinationType,
	requireAdmin,
	validateDestinationConfig,
} from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const type = parseDestinationType(String(form.get('type') ?? ''));
	const is_active = form.get('is_active') === 'on';

	if (!name || !type) return redirect('/admin/destinations/new?error=save_failed');

	const config = buildConfig(type, form);
	const configError = validateDestinationConfig(type, config);
	if (configError) return redirect(`/admin/destinations/new?error=${configError}`);

	const row: Record<string, unknown> = { name, type, config, is_active };

	const encrypted_credentials = await encryptCredentialsFromForm(type, form);
	if (encrypted_credentials) {
		row.encrypted_credentials = encrypted_credentials;
	}

	const { data, error } = await locals.supabase
		.from('destinations')
		.insert(row)
		.select('id')
		.single();

	if (error || !data) return redirect('/admin/destinations/new?error=save_failed');
	return redirect(`/admin/destinations/${data.id}?saved=1`);
};

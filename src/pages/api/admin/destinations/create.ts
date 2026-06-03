import type { APIRoute } from 'astro';
import {
	buildConfig,
	encryptCredentialsFromForm,
	parseDestinationType,
	requireAdmin,
} from '@/lib/admin';
import { canEncryptCredentials } from '@/lib/crypto';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const type = parseDestinationType(String(form.get('type') ?? ''));
	const is_active = form.get('is_active') === 'on';

	if (!name || !type) return redirect('/admin/destinations/new?error=save_failed');

	const config = buildConfig(type, form);
	const row: Record<string, unknown> = { name, type, config, is_active };

	if (canEncryptCredentials()) {
		const encrypted_credentials = await encryptCredentialsFromForm(type, form);
		if (!encrypted_credentials) {
			return redirect('/admin/destinations/new?error=credentials_required');
		}
		row.encrypted_credentials = encrypted_credentials;
	}

	const { data, error } = await locals.supabase
		.from('destinations')
		.insert(row)
		.select('id')
		.single();

	if (error || !data) return redirect('/admin/destinations/new?error=save_failed');
	return redirect(`/admin/destinations/${data.id}`);
};

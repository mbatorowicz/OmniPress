import type { APIRoute } from 'astro';
import {
	buildConfig,
	encryptCredentialsFromForm,
	getDestinationById,
	parseDestinationType,
	requireAdmin,
} from '@/lib/admin';
import { canEncryptCredentials } from '@/lib/crypto';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const destId = params.id;
	if (!destId) return redirect('/admin/destinations');

	const existing = await getDestinationById(locals.supabase, destId);
	if (!existing) return redirect('/admin/destinations');

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const type = parseDestinationType(String(form.get('type') ?? '')) ?? existing.type;
	const is_active = form.get('is_active') === 'on';

	if (!name) return redirect(`/admin/destinations/${destId}?error=save_failed`);

	const config = buildConfig(type, form);
	const update: Record<string, unknown> = { name, type, config, is_active };

	if (canEncryptCredentials()) {
		const encrypted = await encryptCredentialsFromForm(type, form);
		if (encrypted) update.encrypted_credentials = encrypted;
	}

	const { error } = await locals.supabase.from('destinations').update(update).eq('id', destId);
	if (error) return redirect(`/admin/destinations/${destId}?error=save_failed`);
	return redirect(`/admin/destinations/${destId}?saved=1`);
};

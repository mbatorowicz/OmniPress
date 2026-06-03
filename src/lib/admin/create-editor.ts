import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { saveEditorSites } from './user-sites';

export type CreateEditorResult =
	| { ok: true; userId: string }
	| { ok: false; error: 'not_configured' | 'email_required' | 'password_required' | 'create_failed' };

export async function createEditorAccount(opts: {
	email: string;
	displayName: string;
	password: string;
	siteIds: string[];
	defaultSiteId: string | null;
}): Promise<CreateEditorResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'not_configured' };

	const email = opts.email.trim().toLowerCase();
	const password = opts.password.trim();
	if (!email) return { ok: false, error: 'email_required' };
	if (password.length < 8) return { ok: false, error: 'password_required' };

	const supabase = createServiceSupabase();

	const { data, error } = await supabase.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { display_name: opts.displayName.trim() || email.split('@')[0] },
	});

	if (error || !data.user) {
		console.error('createEditor:', error?.message);
		return { ok: false, error: 'create_failed' };
	}

	const userId = data.user.id;

	await supabase
		.from('profiles')
		.update({
			role: 'editor',
			display_name: opts.displayName.trim() || null,
			default_site_id: opts.defaultSiteId,
		})
		.eq('id', userId);

	if (opts.siteIds.length > 0) {
		const mapped = await saveEditorSites(supabase, userId, opts.siteIds, opts.defaultSiteId);
		if (!mapped.ok) return { ok: false, error: 'create_failed' };
	}

	return { ok: true, userId };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/lib/types';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { saveEditorSites } from './user-sites';

export type UserListRow = Pick<Profile, 'id' | 'display_name' | 'default_site_id' | 'role'>;

export type UserAccountError =
	| 'not_configured'
	| 'email_required'
	| 'password_required'
	| 'invalid_role'
	| 'create_failed'
	| 'save_failed'
	| 'not_found'
	| 'self_delete'
	| 'last_admin'
	| 'delete_failed';

export type UserAccountResult =
	| { ok: true; userId: string }
	| { ok: false; error: UserAccountError };

export function parseUserRole(value: string): UserRole | null {
	return value === 'admin' || value === 'editor' ? value : null;
}

export async function listUsers(supabase: SupabaseClient): Promise<UserListRow[]> {
	const { data } = await supabase
		.from('profiles')
		.select('id, display_name, default_site_id, role')
		.order('role')
		.order('display_name');
	return (data ?? []) as UserListRow[];
}

export async function getUserProfile(
	supabase: SupabaseClient,
	userId: string,
): Promise<UserListRow | null> {
	const { data } = await supabase
		.from('profiles')
		.select('id, display_name, default_site_id, role')
		.eq('id', userId)
		.maybeSingle();
	return (data as UserListRow | null) ?? null;
}

async function countAdmins(supabase: SupabaseClient): Promise<number> {
	const { count } = await supabase
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.eq('role', 'admin');
	return count ?? 0;
}

/** E-mail konta z Supabase Auth (wymaga service role). */
export async function getUserEmail(userId: string): Promise<string | null> {
	if (!isServiceSupabaseConfigured()) return null;
	const service = createServiceSupabase();
	const { data } = await service.auth.admin.getUserById(userId);
	return data.user?.email ?? null;
}

export async function createUserAccount(opts: {
	email: string;
	displayName: string;
	password: string;
	role: UserRole;
	siteIds: string[];
	defaultSiteId: string | null;
}): Promise<UserAccountResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'not_configured' };

	const email = opts.email.trim().toLowerCase();
	const password = opts.password.trim();
	if (!email) return { ok: false, error: 'email_required' };
	if (password.length < 8) return { ok: false, error: 'password_required' };

	const service = createServiceSupabase();

	const { data, error } = await service.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { display_name: opts.displayName.trim() || email.split('@')[0] },
	});

	if (error || !data.user) {
		console.error('createUserAccount:', error?.message);
		return { ok: false, error: 'create_failed' };
	}

	const userId = data.user.id;
	const isEditor = opts.role === 'editor';

	await service
		.from('profiles')
		.update({
			role: opts.role,
			display_name: opts.displayName.trim() || null,
			default_site_id: isEditor ? opts.defaultSiteId : null,
		})
		.eq('id', userId);

	if (isEditor && opts.siteIds.length > 0) {
		const mapped = await saveEditorSites(service, userId, opts.siteIds, opts.defaultSiteId);
		if (!mapped.ok) return { ok: false, error: 'create_failed' };
	}

	return { ok: true, userId };
}

export async function updateUserAccount(opts: {
	supabase: SupabaseClient;
	userId: string;
	displayName: string;
	role: UserRole;
	password: string;
}): Promise<UserAccountResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'not_configured' };

	const target = await getUserProfile(opts.supabase, opts.userId);
	if (!target) return { ok: false, error: 'not_found' };

	if (target.role === 'admin' && opts.role === 'editor') {
		const admins = await countAdmins(opts.supabase);
		if (admins <= 1) return { ok: false, error: 'last_admin' };
	}

	const password = opts.password.trim();
	if (password && password.length < 8) return { ok: false, error: 'password_required' };

	const service = createServiceSupabase();

	if (password) {
		const { error } = await service.auth.admin.updateUserById(opts.userId, { password });
		if (error) {
			console.error('updateUserAccount password:', error.message);
			return { ok: false, error: 'save_failed' };
		}
	}

	const { error } = await service
		.from('profiles')
		.update({ display_name: opts.displayName.trim() || null, role: opts.role })
		.eq('id', opts.userId);

	if (error) return { ok: false, error: 'save_failed' };
	return { ok: true, userId: opts.userId };
}

export async function deleteUserAccount(opts: {
	supabase: SupabaseClient;
	userId: string;
	actorId: string;
}): Promise<UserAccountResult> {
	if (!isServiceSupabaseConfigured()) return { ok: false, error: 'not_configured' };
	if (opts.userId === opts.actorId) return { ok: false, error: 'self_delete' };

	const target = await getUserProfile(opts.supabase, opts.userId);
	if (!target) return { ok: false, error: 'not_found' };

	if (target.role === 'admin') {
		const admins = await countAdmins(opts.supabase);
		if (admins <= 1) return { ok: false, error: 'last_admin' };
	}

	const service = createServiceSupabase();
	const { error } = await service.auth.admin.deleteUser(opts.userId);
	if (error) {
		console.error('deleteUserAccount:', error.message);
		return { ok: false, error: 'delete_failed' };
	}

	return { ok: true, userId: opts.userId };
}

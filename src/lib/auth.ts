import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, UserRole } from './types';

export async function getSessionUser(supabase: SupabaseClient) {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) return null;
	return user;
}

export async function getProfile(
	supabase: SupabaseClient,
	userId: string,
): Promise<Profile | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, role, display_name, default_site_id, created_at, updated_at')
		.eq('id', userId)
		.maybeSingle();

	if (error || !data) return null;
	return data as Profile;
}

export async function getUserSites(supabase: SupabaseClient, userId: string) {
	const { data, error } = await supabase
		.from('user_sites')
		.select('site_id, sites(id, name, slug, is_active)')
		.eq('user_id', userId);

	if (error) return [];
	return data ?? [];
}

export function roleHomePath(role: UserRole): string {
	return role === 'admin' ? '/admin' : '/dashboard';
}

export const PUBLIC_PATHS = new Set([
	'/login',
	'/auth/callback',
	'/auth/reset-password',
]);

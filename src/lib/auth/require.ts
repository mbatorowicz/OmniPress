import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from '../types';

export type AuthSession = {
	user: User;
	profile: Profile;
	supabase: SupabaseClient;
};

/** Wymaga sesji ustawionej w middleware (user + profile + supabase). */
export function requireAuth(locals: App.Locals): AuthSession | null {
	if (!locals.user || !locals.profile || !locals.supabase) return null;
	return {
		user: locals.user,
		profile: locals.profile,
		supabase: locals.supabase,
	};
}

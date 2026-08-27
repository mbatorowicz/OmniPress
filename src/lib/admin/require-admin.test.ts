import { describe, expect, it } from 'vitest';
import type { Profile, UserRole } from '../types';
import { requireAdmin } from './require-admin';

function locals(role?: UserRole): App.Locals {
	const profile: Profile | null = role
		? {
				id: 'u1',
				role,
				display_name: null,
				default_site_id: null,
				created_at: '',
				updated_at: '',
			}
		: null;
	return {
		user: role ? ({ id: 'u1' } as App.Locals['user']) : null,
		profile,
		supabase: {} as App.Locals['supabase'],
	} as App.Locals;
}

describe('requireAdmin', () => {
	it('zwraca sesję dla administratora', () => {
		expect(requireAdmin(locals('admin'))?.profile.role).toBe('admin');
	});

	it('odrzuca redaktora', () => {
		expect(requireAdmin(locals('editor'))).toBeNull();
	});

	it('odrzuca brak sesji', () => {
		expect(requireAdmin(locals())).toBeNull();
	});

	it('odrzuca sesję bez profilu (profil skasowany, ciasteczko zostało)', () => {
		expect(
			requireAdmin({
				user: { id: 'u1' } as App.Locals['user'],
				profile: null,
				supabase: {} as App.Locals['supabase'],
			} as App.Locals),
		).toBeNull();
	});

	it('odrzuca profil admina bez użytkownika', () => {
		const base = locals('admin');
		expect(requireAdmin({ ...base, user: null } as App.Locals)).toBeNull();
	});
});

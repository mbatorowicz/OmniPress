import { describe, expect, it } from 'vitest';
import type { Profile } from '../types';
import { requireAuth } from './require';

const profile: Profile = {
	id: 'u1',
	role: 'editor',
	display_name: null,
	default_site_id: null,
	created_at: '',
	updated_at: '',
};

describe('requireAuth', () => {
	it('zwraca null bez user lub profile', () => {
		expect(requireAuth({ user: null, profile: null, supabase: {} as never })).toBeNull();
	});

	it('zwraca sesję gdy user i profile są ustawione', () => {
		const user = { id: 'u1' } as App.Locals['user'];
		const supabase = {} as App.Locals['supabase'];
		const session = requireAuth({ user, profile, supabase });
		expect(session?.user.id).toBe('u1');
		expect(session?.profile.role).toBe('editor');
	});
});

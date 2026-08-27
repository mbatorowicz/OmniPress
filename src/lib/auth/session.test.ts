import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import { getProfile, getSessionUser, getUserSites } from './session';

function withAuth(fake: ReturnType<typeof createSupabaseFake>, getUser: () => unknown) {
	return { ...fake.client, auth: { getUser } } as unknown as SupabaseClient;
}

describe('getSessionUser', () => {
	it('zwraca użytkownika z Supabase Auth', async () => {
		const supabase = withAuth(createSupabaseFake(), async () => ({
			data: { user: { id: 'u1' } },
			error: null,
		}));
		expect(await getSessionUser(supabase)).toEqual({ id: 'u1' });
	});

	it('zwraca null gdy Supabase zgłosi błąd (wygasły token)', async () => {
		const supabase = withAuth(createSupabaseFake(), async () => ({
			data: { user: { id: 'u1' } },
			error: { message: 'jwt expired' },
		}));
		expect(await getSessionUser(supabase)).toBeNull();
	});

	it('zwraca null gdy brak sesji', async () => {
		const supabase = withAuth(createSupabaseFake(), async () => ({
			data: { user: null },
			error: null,
		}));
		expect(await getSessionUser(supabase)).toBeNull();
	});
});

describe('getProfile', () => {
	it('pobiera profil po id z tabeli profiles', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'u1', role: 'admin' } }));
		const profile = await getProfile(fake.client, 'u1');
		expect(profile).toEqual({ id: 'u1', role: 'admin' });
		expect(fake.calls[0]!.table).toBe('profiles');
		expect(hasEq(fake.calls[0]!, 'id', 'u1')).toBe(true);
	});

	it('pobiera rolę i domyślną stronę — pipeline decyduje na ich podstawie', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'u1' } }));
		await getProfile(fake.client, 'u1');
		const columns = String(stepArgs(fake.calls[0]!, 'select')?.[0] ?? '');
		expect(columns).toContain('role');
		expect(columns).toContain('default_site_id');
	});

	it('błąd ma pierwszeństwo nad danymi — nie ufamy odpowiedzi z błędem RLS', async () => {
		const fake = createSupabaseFake(() => ({
			data: { id: 'u1', role: 'admin' },
			error: { message: 'denied' },
		}));
		expect(await getProfile(fake.client, 'u1')).toBeNull();
	});

	it('zwraca null gdy profil nie istnieje', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null }));
		expect(await getProfile(fake.client, 'brak')).toBeNull();
	});
});

describe('getUserSites', () => {
	it('zwraca przypisania redaktora', async () => {
		const rows = [{ site_id: 's1', sites: { id: 's1', name: 'UG', slug: 'ug', is_active: true } }];
		const fake = createSupabaseFake(() => ({ data: rows }));
		expect(await getUserSites(fake.client, 'u1')).toEqual(rows);
		expect(hasEq(fake.calls[0]!, 'user_id', 'u1')).toBe(true);
	});

	it('przy błędzie zwraca pustą listę, a nie dane z niepełnej odpowiedzi', async () => {
		const fake = createSupabaseFake(() => ({
			data: [{ site_id: 'obca' }],
			error: { message: 'denied' },
		}));
		expect(await getUserSites(fake.client, 'u1')).toEqual([]);
	});

	it('zwraca pustą listę gdy Supabase odda null', async () => {
		const fake = createSupabaseFake(() => ({ data: null, error: null }));
		expect(await getUserSites(fake.client, 'u1')).toEqual([]);
	});
});

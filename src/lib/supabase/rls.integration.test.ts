/**
 * Testy integracyjne RLS — wymagają prawdziwej bazy Postgres ze schematem OmniPress.
 * Uruchomienie: RLS_TEST_DATABASE_URL=... npm test
 * Wszystko dzieje się w jednej transakcji zakończonej ROLLBACK — baza zostaje bez zmian.
 */
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readDatabaseUrl, pgClientConfig } from './rls-test-env';

const databaseUrl = readDatabaseUrl();
const suite = databaseUrl ? describe : describe.skip;

type QueryOutcome =
	| { ok: true; rows: Record<string, unknown>[]; rowCount: number }
	| { ok: false; error: string };

let client: pg.Client;

const siteA = '11111111-1111-4111-8111-111111111111';
const siteB = '22222222-2222-4222-8222-222222222222';
const editorA = '33333333-3333-4333-8333-333333333333';
const editorB = '44444444-4444-4444-8444-444444444444';
const adminUser = '55555555-5555-4555-8555-555555555555';
const postA = '66666666-6666-4666-8666-666666666666';
const postB = '77777777-7777-4777-8777-777777777777';

async function asUser(userId: string, sql: string, params: unknown[] = []): Promise<QueryOutcome> {
	await client.query('savepoint rls_case');
	try {
		await client.query('set local role authenticated');
		await client.query(`select set_config('request.jwt.claims', $1, true)`, [
			JSON.stringify({ sub: userId, role: 'authenticated' }),
		]);
		const result = await client.query(sql, params);
		await client.query('reset role');
		await client.query('release savepoint rls_case');
		return { ok: true, rows: result.rows, rowCount: result.rowCount ?? 0 };
	} catch (err) {
		await client.query('rollback to savepoint rls_case');
		await client.query('reset role');
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}

async function selectAs(userId: string, sql: string, params: unknown[] = []) {
	const result = await asUser(userId, sql, params);
	if (!result.ok) throw new Error(result.error);
	return result.rows;
}

async function seedUser(id: string, email: string, role: 'editor' | 'admin') {
	await client.query(
		`insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
		 values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, now(), now())`,
		[id, email],
	);
	await client.query(`update public.profiles set role = $2 where id = $1`, [id, role]);
}

suite('RLS — izolacja redaktorów', () => {
	beforeAll(async () => {
		client = new pg.Client(pgClientConfig(databaseUrl!));
		await client.connect();
		await client.query('begin');

		await client.query(
			`insert into public.sites (id, name, slug) values ($1, 'Test A', $3), ($2, 'Test B', $4)`,
			[siteA, siteB, `rls-test-a-${Date.now()}`, `rls-test-b-${Date.now()}`],
		);

		await seedUser(editorA, `rls-a-${Date.now()}@test.local`, 'editor');
		await seedUser(editorB, `rls-b-${Date.now()}@test.local`, 'editor');
		await seedUser(adminUser, `rls-admin-${Date.now()}@test.local`, 'admin');

		await client.query(
			`insert into public.user_sites (user_id, site_id) values ($1, $3), ($2, $4)`,
			[editorA, editorB, siteA, siteB],
		);

		await client.query(
			`insert into public.posts (id, site_id, author_id, title, slug, status)
			 values ($1, $3, $5, 'Wpis A', 'wpis-a', 'draft'), ($2, $4, $6, 'Wpis B', 'wpis-b', 'draft')`,
			[postA, postB, siteA, siteB, editorA, editorB],
		);
	}, 30_000);

	afterAll(async () => {
		if (!client) return;
		await client.query('rollback');
		await client.end();
	});

	// Każdy przypadek startuje ze stanu z beforeAll — inaczej udana eskalacja
	// w jednym teście zmieniałaby uprawnienia w kolejnych.
	beforeEach(async () => {
		await client.query('savepoint rls_test');
	});

	afterEach(async () => {
		await client.query('rollback to savepoint rls_test');
	});

	describe('posts — odczyt', () => {
		it('redaktor widzi własny wpis', async () => {
			const rows = await selectAs(editorA, 'select id from public.posts where id = $1', [postA]);
			expect(rows).toHaveLength(1);
		});

		it('redaktor nie widzi wpisu z cudzej strony', async () => {
			const rows = await selectAs(editorA, 'select id from public.posts where id = $1', [postB]);
			expect(rows).toEqual([]);
		});

		it('redaktor nie obejdzie RLS zapytaniem bez filtra', async () => {
			const rows = await selectAs(editorA, 'select id from public.posts');
			expect(rows.map((row) => row.id)).not.toContain(postB);
		});

		it('administrator widzi wpisy wszystkich stron', async () => {
			const rows = await selectAs(adminUser, 'select id from public.posts where id in ($1, $2)', [
				postA,
				postB,
			]);
			expect(rows).toHaveLength(2);
		});
	});

	describe('posts — zapis', () => {
		it('redaktor tworzy wpis na przypisanej stronie', async () => {
			const result = await asUser(
				editorA,
				`insert into public.posts (site_id, author_id, title, status) values ($1, $2, 'Nowy', 'draft')`,
				[siteA, editorA],
			);
			expect(result.ok).toBe(true);
		});

		it('redaktor nie utworzy wpisu na nieprzypisanej stronie', async () => {
			const result = await asUser(
				editorA,
				`insert into public.posts (site_id, author_id, title, status) values ($1, $2, 'Obcy', 'draft')`,
				[siteB, editorA],
			);
			expect(result.ok).toBe(false);
		});

		it('redaktor nie podszyje się pod innego autora', async () => {
			const result = await asUser(
				editorA,
				`insert into public.posts (site_id, author_id, title, status) values ($1, $2, 'Podszycie', 'draft')`,
				[siteA, editorB],
			);
			expect(result.ok).toBe(false);
		});

		it('redaktor nie przeniesie własnego wpisu na cudzą stronę', async () => {
			const result = await asUser(editorA, 'update public.posts set site_id = $2 where id = $1', [
				postA,
				siteB,
			]);
			expect(result.ok === false || result.rowCount === 0).toBe(true);
		});

		it('redaktor nie edytuje cudzego wpisu', async () => {
			const result = await asUser(editorA, `update public.posts set title = 'x' where id = $1`, [
				postB,
			]);
			expect(result).toMatchObject({ ok: true, rowCount: 0 });
		});

		it('redaktor nie opublikuje wpisu samodzielnie', async () => {
			const result = await asUser(
				editorA,
				`update public.posts set status = 'published' where id = $1`,
				[postA],
			);
			expect(result.ok === false || result.rowCount === 0).toBe(true);
		});

		it('redaktor wysyła własny szkic do akceptacji', async () => {
			const result = await asUser(
				editorA,
				`update public.posts set status = 'pending' where id = $1`,
				[postA],
			);
			expect(result).toMatchObject({ ok: true, rowCount: 1 });
		});

		it('redaktor nie usuwa cudzego wpisu', async () => {
			const result = await asUser(editorA, 'delete from public.posts where id = $1', [postB]);
			expect(result).toMatchObject({ ok: true, rowCount: 0 });
		});
	});

	describe('dane wrażliwe', () => {
		it('redaktor nie widzi destynacji z tokenami', async () => {
			const rows = await selectAs(editorA, 'select id from public.destinations');
			expect(rows).toEqual([]);
		});

		it('redaktor nie widzi profilu innego użytkownika', async () => {
			const rows = await selectAs(editorA, 'select id from public.profiles where id = $1', [
				editorB,
			]);
			expect(rows).toEqual([]);
		});

		it('redaktor widzi własny profil', async () => {
			const rows = await selectAs(editorA, 'select id from public.profiles where id = $1', [
				editorA,
			]);
			expect(rows).toHaveLength(1);
		});

		it('redaktor nie widzi przypisań innego redaktora', async () => {
			const rows = await selectAs(editorA, 'select site_id from public.user_sites where user_id = $1', [
				editorB,
			]);
			expect(rows).toEqual([]);
		});

		it('redaktor widzi tylko przypisane strony', async () => {
			const rows = await selectAs(editorA, 'select id from public.sites where id in ($1, $2)', [
				siteA,
				siteB,
			]);
			expect(rows.map((row) => row.id)).toEqual([siteA]);
		});

		it('redaktor nie widzi logów publikacji cudzego wpisu', async () => {
			const rows = await selectAs(
				editorA,
				'select id from public.publish_logs where post_id = $1',
				[postB],
			);
			expect(rows).toEqual([]);
		});
	});

	describe('eskalacja uprawnień', () => {
		it('redaktor nie nada sobie roli administratora', async () => {
			const result = await asUser(
				editorA,
				`update public.profiles set role = 'admin' where id = $1`,
				[editorA],
			);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error).toContain('forbidden_profile_field');
		});

		it('redaktor nie przypisze sobie domyślnej strony', async () => {
			const result = await asUser(
				editorA,
				'update public.profiles set default_site_id = $2 where id = $1',
				[editorA, siteB],
			);
			expect(result.ok).toBe(false);
		});

		it('redaktor nie przypisze sobie dostępu do cudzej strony', async () => {
			const result = await asUser(
				editorA,
				'insert into public.user_sites (user_id, site_id) values ($1, $2)',
				[editorA, siteB],
			);
			expect(result.ok).toBe(false);
		});

		it('redaktor nie zmieni roli innego użytkownika', async () => {
			const result = await asUser(
				editorA,
				`update public.profiles set role = 'editor' where id = $1`,
				[adminUser],
			);
			expect(result).toMatchObject({ ok: true, rowCount: 0 });
		});
	});
});

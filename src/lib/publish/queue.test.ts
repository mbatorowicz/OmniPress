import { describe, expect, it } from 'vitest';
import {
	createSupabaseFake,
	hasEq,
	opsFor,
	stepArgs,
	updatePayloads,
	type QueryOp,
} from '@/lib/testing/supabase-fake';
import {
	claimPendingLogs,
	markLogExternalId,
	markLogFailure,
	markLogSuccess,
	resetPublishLogForRetry,
	skipDuplicateSuccess,
} from './queue';
import { MAX_PUBLISH_RETRIES } from './retry';
import type { PublishLogRow } from './types';

function logRow(overrides: Partial<PublishLogRow> = {}): PublishLogRow {
	return {
		id: 'log-1',
		post_id: 'post-1',
		destination_id: 'dest-1',
		status: 'pending',
		external_id: null,
		response_summary: null,
		retry_count: 0,
		next_retry_at: null,
		published_at: null,
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function isSelect(op: QueryOp): boolean {
	return op.steps[0]?.method === 'select';
}

describe('claimPendingLogs', () => {
	it('bez kandydatów nie wykonuje żadnego zapisu', async () => {
		const fake = createSupabaseFake(() => ({ data: [] }));
		expect(await claimPendingLogs(fake.client, 10)).toEqual([]);
		expect(updatePayloads(fake, 'publish_logs')).toEqual([]);
	});

	it('bierze najstarsze wpisy z limitem partii', async () => {
		const fake = createSupabaseFake((op) => (isSelect(op) ? { data: [] } : undefined));
		await claimPendingLogs(fake.client, 7);
		const query = fake.calls[0]!;
		expect(stepArgs(query, 'in')).toEqual(['status', ['pending']]);
		expect(stepArgs(query, 'order')).toEqual(['created_at', { ascending: true }]);
		expect(stepArgs(query, 'limit')).toEqual([7]);
	});

	it('pomija wpisy zaplanowane na przyszłość', async () => {
		const fake = createSupabaseFake((op) => (isSelect(op) ? { data: [] } : undefined));
		await claimPendingLogs(fake.client, 10);
		expect(String(stepArgs(fake.calls[0]!, 'or')?.[0])).toMatch(
			/next_retry_at\.is\.null,next_retry_at\.lte\./,
		);
	});

	it('przestawia zajęte wpisy na processing', async () => {
		const claimed = logRow();
		const fake = createSupabaseFake((op) =>
			isSelect(op) ? { data: [{ id: 'log-1' }] } : { data: claimed },
		);
		expect(await claimPendingLogs(fake.client, 10)).toEqual([claimed]);
		expect(updatePayloads(fake, 'publish_logs')).toEqual([{ status: 'processing' }]);
	});

	it('zajmuje wpis warunkowo — drugi worker nie przejmie go w locie', async () => {
		const fake = createSupabaseFake((op) =>
			isSelect(op) ? { data: [{ id: 'log-1' }] } : { data: logRow() },
		);
		await claimPendingLogs(fake.client, 10);
		const update = opsFor(fake, 'publish_logs')[1]!;
		expect(hasEq(update, 'id', 'log-1')).toBe(true);
		expect(hasEq(update, 'status', 'pending')).toBe(true);
	});

	it('pomija wpis przegrany w wyścigu (update nic nie zwrócił)', async () => {
		const fake = createSupabaseFake((op) =>
			isSelect(op) ? { data: [{ id: 'log-1' }] } : { data: null },
		);
		expect(await claimPendingLogs(fake.client, 10)).toEqual([]);
		expect(opsFor(fake, 'posts')).toHaveLength(0);
	});

	it('przestawia zaplanowany wpis na publishing', async () => {
		const fake = createSupabaseFake((op) =>
			isSelect(op) ? { data: [{ id: 'log-1' }] } : { data: logRow() },
		);
		await claimPendingLogs(fake.client, 10);
		const posts = opsFor(fake, 'posts')[0]!;
		expect(stepArgs(posts, 'update')).toEqual([{ status: 'publishing' }]);
		expect(hasEq(posts, 'id', 'post-1')).toBe(true);
	});

	it('nie rusza statusu wpisów innych niż scheduled', async () => {
		const fake = createSupabaseFake((op) =>
			isSelect(op) ? { data: [{ id: 'log-1' }] } : { data: logRow() },
		);
		await claimPendingLogs(fake.client, 10);
		expect(hasEq(opsFor(fake, 'posts')[0]!, 'status', 'scheduled')).toBe(true);
	});
});

describe('markLogSuccess', () => {
	it('zapisuje sukces i czyści harmonogram ponowienia', async () => {
		const fake = createSupabaseFake();
		await markLogSuccess(fake.client, 'log-1', 'src/content/news/a/index.md', 'OK');
		const payload = updatePayloads(fake, 'publish_logs')[0]!;
		expect(payload).toMatchObject({
			status: 'success',
			external_id: 'src/content/news/a/index.md',
			response_summary: 'OK',
			next_retry_at: null,
		});
		expect(typeof payload.published_at).toBe('string');
	});

	it('przycina opis do 500 znaków (limit kolumny)', async () => {
		const fake = createSupabaseFake();
		await markLogSuccess(fake.client, 'log-1', 'ext', 'x'.repeat(900));
		expect(String(updatePayloads(fake, 'publish_logs')[0]!.response_summary)).toHaveLength(500);
	});

	it('aktualizuje tylko wskazany log', async () => {
		const fake = createSupabaseFake();
		await markLogSuccess(fake.client, 'log-7', 'ext', 'OK');
		expect(hasEq(fake.calls[0]!, 'id', 'log-7')).toBe(true);
	});
});

describe('markLogExternalId', () => {
	it('zapisuje ścieżkę commita przed weryfikacją Vercel', async () => {
		const fake = createSupabaseFake();
		await markLogExternalId(fake.client, 'log-1', 'src/content/news/a/index.md');
		expect(updatePayloads(fake, 'publish_logs')[0]).toEqual({
			external_id: 'src/content/news/a/index.md',
		});
	});

	it('nie zmienia statusu logu', async () => {
		const fake = createSupabaseFake();
		await markLogExternalId(fake.client, 'log-1', 'ext', 'opis');
		expect(updatePayloads(fake, 'publish_logs')[0]).not.toHaveProperty('status');
	});
});

describe('markLogFailure', () => {
	it('błąd przejściowy wraca do kolejki z odroczeniem', async () => {
		const fake = createSupabaseFake();
		await markLogFailure(fake.client, 'log-1', 0, 'GitHub 502', true);
		const payload = updatePayloads(fake, 'publish_logs')[0]!;
		expect(payload.status).toBe('pending');
		expect(payload.retry_count).toBe(1);
		expect(typeof payload.next_retry_at).toBe('string');
	});

	it('błąd trwały kończy log statusem failed', async () => {
		const fake = createSupabaseFake();
		await markLogFailure(fake.client, 'log-1', 0, 'Wpis nie istnieje', false);
		expect(updatePayloads(fake, 'publish_logs')[0]).toMatchObject({
			status: 'failed',
			next_retry_at: null,
		});
	});

	it('po wyczerpaniu prób nie planuje kolejnej', async () => {
		const fake = createSupabaseFake();
		await markLogFailure(fake.client, 'log-1', MAX_PUBLISH_RETRIES, 'GitHub 502', true);
		expect(updatePayloads(fake, 'publish_logs')[0]).toMatchObject({
			status: 'failed',
			next_retry_at: null,
		});
	});

	it('zachowuje external_id, gdy commit poszedł mimo błędu', async () => {
		const fake = createSupabaseFake();
		await markLogFailure(fake.client, 'log-1', 0, 'Vercel build failed', false, 'ext-1');
		expect(updatePayloads(fake, 'publish_logs')[0]!.external_id).toBe('ext-1');
	});

	it('nie nadpisuje external_id, gdy go nie przekazano', async () => {
		const fake = createSupabaseFake();
		await markLogFailure(fake.client, 'log-1', 0, 'blad', false);
		expect(updatePayloads(fake, 'publish_logs')[0]).not.toHaveProperty('external_id');
	});
});

describe('skipDuplicateSuccess', () => {
	it('log bez external_id nie jest duplikatem — bez zapytania', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'inny' } }));
		expect(await skipDuplicateSuccess(fake.client, logRow())).toBe(false);
		expect(fake.calls).toHaveLength(0);
	});

	it('wykrywa wcześniejszą udaną publikację tej samej pary wpis/destynacja', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'log-0' } }));
		expect(await skipDuplicateSuccess(fake.client, logRow({ external_id: 'ext' }))).toBe(true);
		const op = fake.calls[0]!;
		expect(hasEq(op, 'post_id', 'post-1')).toBe(true);
		expect(hasEq(op, 'destination_id', 'dest-1')).toBe(true);
		expect(hasEq(op, 'status', 'success')).toBe(true);
		expect(stepArgs(op, 'neq')).toEqual(['id', 'log-1']);
	});

	it('brak innego sukcesu = publikujemy', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		expect(await skipDuplicateSuccess(fake.client, logRow({ external_id: 'ext' }))).toBe(false);
	});
});

describe('resetPublishLogForRetry', () => {
	it('czyści opis i harmonogram przy ręcznym ponowieniu', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'log-1' } }));
		expect(await resetPublishLogForRetry(fake.client, 'log-1')).toBe(true);
		expect(updatePayloads(fake, 'publish_logs')[0]).toEqual({
			status: 'pending',
			next_retry_at: null,
			response_summary: null,
		});
	});

	it('ponawia tylko logi w statusie failed', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'log-1' } }));
		await resetPublishLogForRetry(fake.client, 'log-1');
		expect(hasEq(fake.calls[0]!, 'status', 'failed')).toBe(true);
	});

	it('zwraca false, gdy log nie był w stanie failed', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		expect(await resetPublishLogForRetry(fake.client, 'log-1')).toBe(false);
	});
});

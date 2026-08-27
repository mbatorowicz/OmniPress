import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import type { PublishLogRow } from './types';

const queue = vi.hoisted(() => ({
	claimPendingLogs: vi.fn(),
	markLogExternalId: vi.fn(),
	markLogFailure: vi.fn(),
	markLogSuccess: vi.fn(),
	skipDuplicateSuccess: vi.fn(),
}));
const dispatch = vi.hoisted(() => ({
	dispatchPublish: vi.fn(),
	loadDestinationForPublish: vi.fn(),
	loadPostForPublish: vi.fn(),
}));
const syncPostStatusFromLogs = vi.hoisted(() => vi.fn());

vi.mock('./queue', () => queue);
vi.mock('./dispatch', () => dispatch);
vi.mock('./sync-post-status', () => ({ syncPostStatusFromLogs }));

const { runPublishWorker } = await import('./worker');

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

beforeEach(() => {
	vi.clearAllMocks();
	queue.claimPendingLogs.mockResolvedValue([]);
	queue.skipDuplicateSuccess.mockResolvedValue(false);
	dispatch.loadPostForPublish.mockResolvedValue({ id: 'post-1' });
	dispatch.loadDestinationForPublish.mockResolvedValue({ id: 'dest-1', type: 'github_astro' });
	dispatch.dispatchPublish.mockResolvedValue({ ok: true, externalId: 'ext', summary: 'OK' });
});

describe('odzyskiwanie zawieszonych wpisów', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('wraca do pending po 15 minutach w processing', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
		const fake = createSupabaseFake();
		await runPublishWorker(fake.client);
		const op = fake.calls[0]!;
		expect(op.table).toBe('publish_logs');
		expect(stepArgs(op, 'update')).toEqual([{ status: 'pending' }]);
		expect(hasEq(op, 'status', 'processing')).toBe(true);
		expect(stepArgs(op, 'lt')).toEqual(['updated_at', '2026-01-01T11:45:00.000Z']);
	});

	it('biegnie przed pobraniem partii — inaczej zawieszony log przepadłby na kolejną turę', async () => {
		const order: string[] = [];
		const fake = createSupabaseFake(() => {
			order.push('recover');
			return undefined;
		});
		queue.claimPendingLogs.mockImplementation(async () => {
			order.push('claim');
			return [];
		});
		await runPublishWorker(fake.client);
		expect(order).toEqual(['recover', 'claim']);
	});
});

describe('pusta kolejka', () => {
	it('zwraca zerowy raport', async () => {
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toEqual({
			processed: 0,
			succeeded: 0,
			failed: 0,
			skipped: 0,
		});
		expect(syncPostStatusFromLogs).not.toHaveBeenCalled();
	});
});

describe('publikacja udana', () => {
	it('zapisuje sukces z identyfikatorem zewnętrznym', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow()]);
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toEqual({
			processed: 1,
			succeeded: 1,
			failed: 0,
			skipped: 0,
		});
		expect(queue.markLogSuccess).toHaveBeenCalledWith(fake.client, 'log-1', 'ext', 'OK');
	});

	it('przekazuje wcześniejszy external_id, żeby nadpisać ten sam plik', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow({ external_id: 'ext-0' })]);
		queue.skipDuplicateSuccess.mockResolvedValue(false);
		const fake = createSupabaseFake();
		await runPublishWorker(fake.client);
		expect(dispatch.dispatchPublish).toHaveBeenCalledWith(
			fake.client,
			{ id: 'post-1' },
			{ id: 'dest-1', type: 'github_astro' },
			'ext-0',
		);
	});

	it('synchronizuje status wpisu raz na wpis, nie raz na log', async () => {
		queue.claimPendingLogs.mockResolvedValue([
			logRow({ id: 'log-1', destination_id: 'dest-1' }),
			logRow({ id: 'log-2', destination_id: 'dest-2' }),
		]);
		const fake = createSupabaseFake();
		await runPublishWorker(fake.client);
		expect(syncPostStatusFromLogs).toHaveBeenCalledTimes(1);
		expect(syncPostStatusFromLogs).toHaveBeenCalledWith(fake.client, 'post-1');
	});
});

describe('duplikat publikacji', () => {
	it('nie publikuje drugi raz i liczy log jako pominięty', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow({ external_id: 'ext-0' })]);
		queue.skipDuplicateSuccess.mockResolvedValue(true);
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toMatchObject({
			processed: 1,
			skipped: 1,
			succeeded: 1,
			failed: 0,
		});
		expect(dispatch.dispatchPublish).not.toHaveBeenCalled();
		expect(queue.markLogSuccess).toHaveBeenCalled();
	});
});

describe('brakujące dane', () => {
	it('usunięty wpis kończy log trwałym błędem', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow()]);
		dispatch.loadPostForPublish.mockResolvedValue(null);
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toMatchObject({ failed: 1, succeeded: 0 });
		expect(queue.markLogFailure).toHaveBeenCalledWith(
			fake.client,
			'log-1',
			0,
			expect.any(String),
			false,
		);
		expect(dispatch.dispatchPublish).not.toHaveBeenCalled();
	});

	it('usunięta destynacja kończy log trwałym błędem', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow()]);
		dispatch.loadDestinationForPublish.mockResolvedValue(null);
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toMatchObject({ failed: 1 });
		expect(queue.markLogFailure.mock.calls[0]![4]).toBe(false);
	});
});

describe('publikacja nieudana', () => {
	it('błąd przejściowy zostaje oznaczony jako ponowialny', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow({ retry_count: 2 })]);
		dispatch.dispatchPublish.mockResolvedValue({
			ok: false,
			summary: 'GitHub 502',
			retryable: true,
		});
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toMatchObject({ failed: 1 });
		expect(queue.markLogFailure).toHaveBeenCalledWith(
			fake.client,
			'log-1',
			2,
			'GitHub 502',
			true,
			undefined,
		);
	});

	it('zapisuje external_id, gdy commit poszedł a padła weryfikacja', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow()]);
		dispatch.dispatchPublish.mockResolvedValue({
			ok: false,
			summary: 'Vercel build failed',
			retryable: false,
			externalId: 'ext-1',
		});
		const fake = createSupabaseFake();
		await runPublishWorker(fake.client);
		expect(queue.markLogExternalId).toHaveBeenCalledWith(
			fake.client,
			'log-1',
			'ext-1',
			'Vercel build failed',
		);
		expect(queue.markLogFailure.mock.calls[0]![5]).toBe('ext-1');
	});

	it('bez external_id nie dotyka kolumny', async () => {
		queue.claimPendingLogs.mockResolvedValue([logRow()]);
		dispatch.dispatchPublish.mockResolvedValue({ ok: false, summary: 'blad', retryable: true });
		const fake = createSupabaseFake();
		await runPublishWorker(fake.client);
		expect(queue.markLogExternalId).not.toHaveBeenCalled();
	});

	it('wyjątek nie przerywa partii i zostawia log do ponowienia', async () => {
		queue.claimPendingLogs.mockResolvedValue([
			logRow({ id: 'log-1', post_id: 'post-1' }),
			logRow({ id: 'log-2', post_id: 'post-2' }),
		]);
		dispatch.dispatchPublish
			.mockRejectedValueOnce(new Error('ECONNRESET'))
			.mockResolvedValueOnce({ ok: true, externalId: 'ext', summary: 'OK' });
		const fake = createSupabaseFake();
		expect(await runPublishWorker(fake.client)).toMatchObject({
			processed: 2,
			succeeded: 1,
			failed: 1,
		});
		expect(queue.markLogFailure).toHaveBeenCalledWith(
			fake.client,
			'log-1',
			0,
			'ECONNRESET',
			true,
		);
		expect(syncPostStatusFromLogs).toHaveBeenCalledTimes(2);
	});
});

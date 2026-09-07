import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	secret: 's3cret' as string | undefined,
	serviceOk: true,
}));

vi.mock('@/lib/supabase/service', () => ({
	isServiceSupabaseConfigured: () => mocks.serviceOk,
}));

vi.stubEnv('CRON_SECRET', 's3cret');

const { authorizeCronRequest, runCronJob } = await import('./worker');

function req(auth?: string): Request {
	return new Request('https://panel.test/api/worker/publish', {
		headers: auth ? { authorization: auth } : {},
	});
}

afterEach(() => {
	mocks.secret = 's3cret';
	mocks.serviceOk = true;
	vi.stubEnv('CRON_SECRET', 's3cret');
});

describe('authorizeCronRequest', () => {
	it('odrzuca brak sekretu w środowisku', () => {
		vi.stubEnv('CRON_SECRET', '');
		expect(authorizeCronRequest(req('Bearer s3cret'))?.status).toBe(401);
	});

	it('odrzuca zły Bearer', () => {
		expect(authorizeCronRequest(req('Bearer zly'))?.status).toBe(401);
	});

	it('odrzuca Bearer o innej długości (porównanie stałoczasowe nie wybucha)', () => {
		expect(authorizeCronRequest(req('Bearer x'))?.status).toBe(401);
	});

	it('przepuszcza zgodny sekret przy skonfigurowanym service role', () => {
		expect(authorizeCronRequest(req('Bearer s3cret'))).toBeNull();
	});
});

describe('runCronJob', () => {
	it('nie wstawia err.message do JSON 500', async () => {
		const res = await runCronJob(req('Bearer s3cret'), async () => {
			throw new Error('hasło bazy i stacktrace');
		});
		expect(res.status).toBe(500);
		await expect(res.json()).resolves.toEqual({ ok: false, error: 'worker_error' });
	});
});

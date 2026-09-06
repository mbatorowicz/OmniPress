import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq } from '@/lib/testing/supabase-fake';
import {
	loadFirstPublishedAt,
	resolvePublishDate,
	resolveSavedPublishAt,
	toPublishAtIso,
} from './publish-date';

describe('toPublishAtIso', () => {
	it('normalizuje datę z front-matteru', () => {
		expect(toPublishAtIso('2026-08-11')).toBe('2026-08-11T00:00:00.000Z');
		expect(toPublishAtIso('2024-09-03T08:00:00+00:00')).toBe('2024-09-03T08:00:00.000Z');
	});

	it('odrzuca pustą i nieparsowalną wartość', () => {
		expect(toPublishAtIso(null)).toBeNull();
		expect(toPublishAtIso('')).toBeNull();
		expect(toPublishAtIso('nie-data')).toBeNull();
	});
});

describe('resolvePublishDate', () => {
	const now = '2026-09-06T12:00:00.000Z';

	it('bierze datę harmonogramu, nie późniejszego logu', () => {
		expect(
			resolvePublishDate({
				scheduledPublishAt: '2026-08-11T10:00:00.000Z',
				firstPublishedAt: '2026-09-06T08:00:00.000Z',
				now,
			}),
		).toBe('2026-08-11T10:00:00.000Z');
	});

	it('bez harmonogramu zostawia datę pierwszej publikacji', () => {
		expect(
			resolvePublishDate({
				scheduledPublishAt: null,
				firstPublishedAt: '2025-10-21T10:00:00.000Z',
				now,
			}),
		).toBe('2025-10-21T10:00:00.000Z');
	});

	it('pierwsza publikacja bez daty = teraz — nigdy updated_at', () => {
		expect(resolvePublishDate({ now })).toBe(now);
	});
});

describe('resolveSavedPublishAt', () => {
	it('formularz nadpisuje istniejącą datę', () => {
		expect(
			resolveSavedPublishAt({
				formValue: '2026-09-01T10:00:00.000Z',
				existingScheduledAt: '2026-08-01T10:00:00.000Z',
				defaultToNow: true,
			}),
		).toBe('2026-09-01T10:00:00.000Z');
	});

	it('puste pole zostawia datę pierwszej publikacji', () => {
		expect(
			resolveSavedPublishAt({
				formValue: null,
				existingScheduledAt: '2026-08-19T08:36:45.969Z',
				firstPublishedAt: '2026-01-01T00:00:00.000Z',
				defaultToNow: true,
			}),
		).toBe('2026-08-19T08:36:45.969Z');
	});

	it('szkic bez daty przy wysłaniu dostaje teraz', () => {
		const before = Date.now();
		const value = resolveSavedPublishAt({
			formValue: null,
			existingScheduledAt: null,
			defaultToNow: true,
		});
		expect(value).toBeTruthy();
		expect(new Date(value!).getTime()).toBeGreaterThanOrEqual(before);
	});

	it('zapis szkicu bez daty nie wymusza teraz', () => {
		expect(
			resolveSavedPublishAt({
				formValue: null,
				existingScheduledAt: null,
				defaultToNow: false,
			}),
		).toBeNull();
	});
});

describe('loadFirstPublishedAt', () => {
	it('wybiera najstarszy sukces', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'publish_logs' && hasEq(op, 'post_id', 'post-1')) {
				return {
					data: [
						{ published_at: '2026-09-01T12:00:00.000Z' },
						{ published_at: '2026-06-03T08:00:00.000Z' },
						{ published_at: null },
					],
				};
			}
			return { data: null };
		});
		expect(await loadFirstPublishedAt(fake.client, 'post-1')).toBe('2026-06-03T08:00:00.000Z');
	});

	it('zwraca null gdy nie było publikacji', async () => {
		const fake = createSupabaseFake(() => ({ data: [] }));
		expect(await loadFirstPublishedAt(fake.client, 'post-1')).toBeNull();
	});
});

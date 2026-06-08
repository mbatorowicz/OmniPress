import { describe, expect, it } from 'vitest';
import {
	formatScheduledPublishAt,
	isScheduledPublishDue,
	parseScheduledPublishAtInput,
	utcIsoToWallTimeInput,
	wallTimeInZoneToUtcIso,
} from './scheduled-publish';

describe('scheduled-publish', () => {
	it('konwertuje czas warszawski na UTC i z powrotem', () => {
		const iso = wallTimeInZoneToUtcIso('2026-06-17T10:00');
		expect(iso).toBeTruthy();
		expect(utcIsoToWallTimeInput(iso!)).toBe('2026-06-17T10:00');
	});

	it('formatuje datę po polsku', () => {
		const text = formatScheduledPublishAt('2026-06-17T08:00:00.000Z');
		expect(text).toContain('2026');
		expect(text).toContain('17');
	});

	it('odrzuca przeszłą datę przy wysyłce', () => {
		const past = utcIsoToWallTimeInput(new Date(Date.now() - 3600_000).toISOString());
		const result = parseScheduledPublishAtInput(past);
		expect(result.error).toBe('past');
	});

	it('isScheduledPublishDue bez daty = natychmiast', () => {
		expect(isScheduledPublishDue(null)).toBe(true);
		expect(isScheduledPublishDue(undefined)).toBe(true);
	});
});

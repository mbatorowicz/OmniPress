import { describe, expect, it } from 'vitest';
import {
	combineScheduleDateHour,
	formatScheduledPublishAt,
	isScheduledPublishDue,
	parseScheduledPublishAtInput,
	publishHourOptions,
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

	it('pusta wartość = publikacja w momencie wysłania (bez błędu)', () => {
		expect(parseScheduledPublishAtInput('')).toEqual({ value: null });
		expect(parseScheduledPublishAtInput(null)).toEqual({ value: null });
	});

	it('isScheduledPublishDue bez daty = natychmiast', () => {
		expect(isScheduledPublishDue(null)).toBe(true);
		expect(isScheduledPublishDue(undefined)).toBe(true);
	});

	it('godziny publikacji: pełne godziny 6:00–20:00', () => {
		const hours = publishHourOptions();
		expect(hours[0]).toBe('06:00');
		expect(hours[hours.length - 1]).toBe('20:00');
		expect(hours).toHaveLength(15);
	});

	it('łączy datę i godzinę z formularza', () => {
		expect(combineScheduleDateHour('2026-06-17', '08:00')).toBe('2026-06-17T08:00');
		expect(combineScheduleDateHour('', '08:00')).toBe('');
		expect(combineScheduleDateHour(null, null)).toBe('');
	});
});

export const PUBLISH_TIMEZONE = 'Europe/Warsaw';
export const PUBLISH_HOUR_FIRST = 6;
export const PUBLISH_HOUR_LAST = 20;
export const DEFAULT_PUBLISH_HOUR = '12:00';
const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Godziny publikacji do wyboru w UI — pełne godziny 6:00–20:00. */
export function publishHourOptions(): string[] {
	const out: string[] = [];
	for (let h = PUBLISH_HOUR_FIRST; h <= PUBLISH_HOUR_LAST; h++) {
		out.push(`${String(h).padStart(2, '0')}:00`);
	}
	return out;
}

/** Pola formularza (data + godzina) → wall time `YYYY-MM-DDTHH:mm`; '' gdy brak daty. */
export function combineScheduleDateHour(
	dateRaw: FormDataEntryValue | null | undefined,
	hourRaw: FormDataEntryValue | null | undefined,
): string {
	const date = String(dateRaw ?? '').trim();
	if (!date) return '';
	const hour = String(hourRaw ?? '').trim() || DEFAULT_PUBLISH_HOUR;
	return `${date}T${hour}`;
}

type ZonedParts = { y: number; mo: number; d: number; h: number; mi: number };

function zonedParts(date: Date, timeZone: string): ZonedParts {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date);

	const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	return { y: pick('year'), mo: pick('month'), d: pick('day'), h: pick('hour'), mi: pick('minute') };
}

function partsMatch(want: ZonedParts, got: ZonedParts): boolean {
	return want.y === got.y && want.mo === got.mo && want.d === got.d && want.h === got.h && want.mi === got.mi;
}

/** datetime-local (czas polski) → ISO UTC w bazie. */
export function wallTimeInZoneToUtcIso(wall: string, timeZone = PUBLISH_TIMEZONE): string | null {
	const m = wall.trim().match(DATETIME_LOCAL_RE);
	if (!m) return null;
	const want: ZonedParts = {
		y: Number(m[1]),
		mo: Number(m[2]),
		d: Number(m[3]),
		h: Number(m[4]),
		mi: Number(m[5]),
	};

	let t = Date.UTC(want.y, want.mo - 1, want.d, want.h - 2, want.mi);
	for (let i = 0; i < 72; i++) {
		const got = zonedParts(new Date(t), timeZone);
		if (partsMatch(want, got)) return new Date(t).toISOString();

		const wantMin = want.h * 60 + want.mi;
		const gotMin = got.h * 60 + got.mi;
		let dayDelta = want.d - got.d;
		if (dayDelta > 15) dayDelta -= 31;
		if (dayDelta < -15) dayDelta += 31;
		const diffMin = dayDelta * 24 * 60 + (wantMin - gotMin);
		t += diffMin * 60_000;
	}
	return null;
}

export function utcIsoToWallTimeInput(iso: string | null, timeZone = PUBLISH_TIMEZONE): string {
	if (!iso) return '';
	const p = zonedParts(new Date(iso), timeZone);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

export function formatScheduledPublishAt(iso: string | null): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat('pl-PL', {
		timeZone: PUBLISH_TIMEZONE,
		dateStyle: 'long',
		timeStyle: 'short',
	}).format(new Date(iso));
}

/** Pusta wartość = publikacja w momencie wysłania (bez błędu). */
export function parseScheduledPublishAtInput(
	raw: FormDataEntryValue | null | undefined,
): { value: string | null; error?: 'invalid' | 'past' } {
	const trimmed = String(raw ?? '').trim();
	if (!trimmed) return { value: null };

	const iso = wallTimeInZoneToUtcIso(trimmed);
	if (!iso) return { value: null, error: 'invalid' };
	if (new Date(iso).getTime() <= Date.now()) return { value: iso, error: 'past' };
	return { value: iso };
}

export function isScheduledPublishDue(iso: string | null | undefined, now = Date.now()): boolean {
	if (!iso) return true;
	return new Date(iso).getTime() <= now;
}

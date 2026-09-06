import type { SupabaseClient } from '@supabase/supabase-js';

function firstValidIso(...values: Array<string | null | undefined>): string | null {
	for (const value of values) {
		if (!value) continue;
		const time = new Date(value).getTime();
		if (!Number.isNaN(time)) return new Date(time).toISOString();
	}
	return null;
}

/** Data z front-matteru (pubDate / date) → ISO do `scheduled_publish_at`. */
export function toPublishAtIso(raw: string | null | undefined): string | null {
	return firstValidIso(raw);
}

/**
 * Data w artykule na stronie: pierwsza publikacja, nigdy `updated_at`.
 * Kolejnosc: data z formularza / harmonogram → najstarszy sukces w logu → teraz.
 */
export function resolvePublishDate(input: {
	scheduledPublishAt?: string | null;
	firstPublishedAt?: string | null;
	now?: string;
}): string {
	return (
		firstValidIso(input.scheduledPublishAt, input.firstPublishedAt) ??
		input.now ??
		new Date().toISOString()
	);
}

/** Zapis / wysłanie: nie kasuj daty pierwszej publikacji, gdy pole w formularzu jest puste. */
export function resolveSavedPublishAt(input: {
	formValue: string | null;
	existingScheduledAt: string | null;
	firstPublishedAt?: string | null;
	defaultToNow: boolean;
}): string | null {
	const kept = firstValidIso(input.formValue, input.existingScheduledAt, input.firstPublishedAt);
	if (kept) return kept;
	return input.defaultToNow ? new Date().toISOString() : null;
}

/** Najstarsza udana publikacja wpisu — data z importu albo pierwszego commita. */
export async function loadFirstPublishedAt(
	supabase: SupabaseClient,
	postId: string,
): Promise<string | null> {
	const { data } = await supabase
		.from('publish_logs')
		.select('published_at')
		.eq('post_id', postId)
		.eq('status', 'success');
	const dates = (data ?? [])
		.map((row) => (row as { published_at?: string | null }).published_at)
		.filter((value): value is string => Boolean(value));
	return firstValidIso(...dates.sort());
}

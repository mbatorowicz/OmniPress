/**
 * Lokalny szkic pól edytora — przetrwa odświeżenie karty, znika po zapisie.
 * SSOT kluczy formularza: nazwy `name` w PostEditorForm.
 */

export type PostDraftFields = {
	title: string;
	slug: string;
	category_slug: string;
	extra_category_slugs: string;
	content_md: string;
	scheduled_publish_date: string;
	scheduled_publish_hour: string;
};

export type PostDraftRecord = {
	baseline: PostDraftFields;
	values: PostDraftFields;
};

export const POST_DRAFT_FIELDS = [
	'title',
	'slug',
	'category_slug',
	'extra_category_slugs',
	'content_md',
	'scheduled_publish_date',
	'scheduled_publish_hour',
] as const;

export function draftStorageKey(postId: string): string {
	return `omnipress:post-draft:${postId}`;
}

export function emptyDraftFields(): PostDraftFields {
	return {
		title: '',
		slug: '',
		category_slug: '',
		extra_category_slugs: '',
		content_md: '',
		scheduled_publish_date: '',
		scheduled_publish_hour: '',
	};
}

export function fieldsEqual(a: PostDraftFields, b: PostDraftFields): boolean {
	return POST_DRAFT_FIELDS.every((key) => a[key] === b[key]);
}

export function shouldRestoreDraft(draft: PostDraftRecord, server: PostDraftFields): boolean {
	return fieldsEqual(draft.baseline, server) && !fieldsEqual(draft.values, server);
}

export function parseDraftFields(value: unknown): PostDraftFields | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (!POST_DRAFT_FIELDS.every((key) => typeof record[key] === 'string')) return null;
	return {
		title: record.title as string,
		slug: record.slug as string,
		category_slug: record.category_slug as string,
		extra_category_slugs: record.extra_category_slugs as string,
		content_md: record.content_md as string,
		scheduled_publish_date: record.scheduled_publish_date as string,
		scheduled_publish_hour: record.scheduled_publish_hour as string,
	};
}

function isDraftFields(value: unknown): value is PostDraftFields {
	return parseDraftFields(value) !== null;
}

export function parseDraftRecord(raw: string | null): PostDraftRecord | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as PostDraftRecord;
		if (!isDraftFields(parsed.baseline) || !isDraftFields(parsed.values)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function readDraft(storage: Storage, postId: string): PostDraftRecord | null {
	return parseDraftRecord(storage.getItem(draftStorageKey(postId)));
}

export function writeDraft(storage: Storage, postId: string, record: PostDraftRecord): void {
	storage.setItem(draftStorageKey(postId), JSON.stringify(record));
}

export function clearDraft(storage: Storage, postId: string): void {
	storage.removeItem(draftStorageKey(postId));
}

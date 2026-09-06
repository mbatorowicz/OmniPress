import { describe, expect, it } from 'vitest';
import {
	clearDraft,
	draftStorageKey,
	emptyDraftFields,
	fieldsEqual,
	parseDraftRecord,
	readDraft,
	shouldRestoreDraft,
	writeDraft,
	type PostDraftFields,
	type PostDraftRecord,
} from './draft-store';

const serverEmpty = emptyDraftFields();

const typed: PostDraftFields = {
	...serverEmpty,
	title: 'Komunikat',
	content_md: 'Treść szkicu',
	category_slug: 'aktualnosci',
	extra_category_slugs: '',
};

const record = (baseline: PostDraftFields, values: PostDraftFields): PostDraftRecord => ({
	baseline,
	values,
});

describe('draft-store', () => {
	it('składa klucz per wpis', () => {
		expect(draftStorageKey('abc')).toBe('omnipress:post-draft:abc');
	});

	it('porównuje pola po wszystkich kluczach', () => {
		expect(fieldsEqual(typed, typed)).toBe(true);
		expect(fieldsEqual(typed, { ...typed, slug: 'inny' })).toBe(false);
	});

	it('przywraca tylko gdy serwer nie zmienił się od momentu pisania', () => {
		expect(shouldRestoreDraft(record(serverEmpty, typed), serverEmpty)).toBe(true);
		expect(shouldRestoreDraft(record(serverEmpty, typed), typed)).toBe(false);
		expect(shouldRestoreDraft(record(typed, { ...typed, title: 'Nowe' }), serverEmpty)).toBe(
			false,
		);
	});

	it('nie przywraca, gdy wartości są identyczne z serwerem', () => {
		expect(shouldRestoreDraft(record(serverEmpty, serverEmpty), serverEmpty)).toBe(false);
	});

	it('odrzuca uszkodzony JSON i niepełny rekord', () => {
		expect(parseDraftRecord(null)).toBeNull();
		expect(parseDraftRecord('{')).toBeNull();
		expect(parseDraftRecord(JSON.stringify({ baseline: {}, values: typed }))).toBeNull();
	});

	it('czyta i czyści rekord w Storage', () => {
		const storage = new Map<string, string>() as unknown as Storage;
		const map = storage as unknown as Map<string, string>;
		const api: Storage = {
			getItem: (key) => map.get(key) ?? null,
			setItem: (key, value) => {
				map.set(key, value);
			},
			removeItem: (key) => {
				map.delete(key);
			},
			clear: () => map.clear(),
			key: () => null,
			length: 0,
		};

		writeDraft(api, 'p1', record(serverEmpty, typed));
		expect(readDraft(api, 'p1')?.values.title).toBe('Komunikat');
		clearDraft(api, 'p1');
		expect(readDraft(api, 'p1')).toBeNull();
	});
});

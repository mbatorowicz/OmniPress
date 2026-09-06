import { describe, expect, it } from 'vitest';
import { mergeLayoutFromFormData, parseLayoutFromFormData } from './parse-form';
import { parseCategoriesFromForm } from './parse-form-categories';
import { migrateFlatSlotsToZones } from './zones';
import { DEFAULT_LAYOUT_PATH, type SiteAstroLayout } from './types';

function categoryForm(pairs: Array<[slug: string, name: string]>): FormData {
	const form = new FormData();
	for (const [slug, name] of pairs) {
		form.append('category_slug', slug);
		form.append('category_name', name);
	}
	return form;
}

describe('parseCategoriesFromForm', () => {
	it('normalizuje zarządzenia → zarzadzenia (regresja)', () => {
		const result = parseCategoriesFromForm(categoryForm([['zarządzenia', 'Zarządzenia']]));
		expect(result).toEqual({
			ok: true,
			categories: [{ slug: 'zarzadzenia', name: 'Zarządzenia' }],
		});
	});

	it('odrzuca slug, który po normalizacji jest pusty', () => {
		const result = parseCategoriesFromForm(categoryForm([['!!', 'Złe']]));
		expect(result).toEqual({ ok: false, error: 'invalid_category_slug' });
	});

	it('odrzuca duplikat po normalizacji (zarządzenia + zarzadzenia)', () => {
		const result = parseCategoriesFromForm(
			categoryForm([
				['zarządzenia', 'Zarządzenia'],
				['zarzadzenia', 'Zarządzenia 2'],
			]),
		);
		expect(result).toEqual({ ok: false, error: 'duplicate_category_slug' });
	});

	it('nie pomija wiersza z nazwą i pustym slugiem', () => {
		const result = parseCategoriesFromForm(categoryForm([['', 'Aktualności']]));
		expect(result).toEqual({ ok: false, error: 'invalid_category_slug' });
	});

	it('zachowuje 1 kolumnę gdy lista tytułów też wysyła kolumny', () => {
		const form = new FormData();
		form.append('category_slug', 'zarzadzenia');
		form.append('category_name', 'Zarządzenia');
		form.append('category_archive_layout', 'title-list');
		form.append('category_archive_columns', '1');
		form.append('category_slug', 'ochrona-ludnosci');
		form.append('category_name', 'Ochrona ludności');
		form.append('category_archive_layout', 'tiles');
		form.append('category_archive_columns', '1');

		const result = parseCategoriesFromForm(form);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.categories).toEqual([
			{ slug: 'zarzadzenia', name: 'Zarządzenia', archiveLayout: 'title-list' },
			{ slug: 'ochrona-ludnosci', name: 'Ochrona ludności', archiveColumns: 1 },
		]);
	});
});

describe('mergeLayoutFromFormData categories', () => {
	const existing: SiteAstroLayout = {
		navigation: [],
		categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		categoryDisplays: {},
		zones: migrateFlatSlotsToZones([]),
		slots: [],
		layoutPath: DEFAULT_LAYOUT_PATH,
		navigationPath: 'src/config/omnipress-navigation.json',
		categoriesPath: 'src/config/omnipress-categories.json',
	};

	it('przekazuje duplicate_category_slug przy zapisie sekcji', () => {
		const result = mergeLayoutFromFormData(
			categoryForm([
				['zarządzenia', 'A'],
				['zarzadzenia', 'B'],
			]),
			existing,
			'categories',
		);
		expect(result).toEqual({ ok: false, error: 'duplicate_category_slug' });
	});

	it('składa layout z poprawnym slugiem zarzadzenia', () => {
		const form = new FormData();
		form.set('navigation_json', '[{"label":"Kontakt","href":"/kontakt"}]');
		form.append('category_slug', 'zarzadzenia');
		form.append('category_name', 'Zarządzenia');
		form.append('slot_id', 'home_pinned');
		form.append('slot_label', 'Przypięte');
		form.append('slot_component', 'home.pinned');
		form.set('slot_enabled_home_pinned', 'on');

		const result = parseLayoutFromFormData(form, {
			layoutPath: DEFAULT_LAYOUT_PATH,
			navigationPath: 'src/config/omnipress-navigation.json',
			categoriesPath: 'src/config/omnipress-categories.json',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.layout.categories[0]?.slug).toBe('zarzadzenia');
	});
});

import { describe, expect, it } from 'vitest';
import {
	applyCategoryArchiveFieldsFromForm,
	normalizeCategoryDefinition,
	readCategoryArchiveColumns,
	readCategoryArchiveLayout,
	resolveCategoryArchiveSettings,
} from './category-archive';
import type { CategoryDefinition } from './types';

describe('category-archive', () => {
	it('readCategoryArchiveLayout akceptuje znane wartości', () => {
		expect(readCategoryArchiveLayout('title-list')).toBe('title-list');
		expect(readCategoryArchiveLayout('tiles')).toBe('tiles');
		expect(readCategoryArchiveLayout('invalid')).toBeUndefined();
	});

	it('readCategoryArchiveColumns akceptuje string i number', () => {
		expect(readCategoryArchiveColumns(3)).toBe(3);
		expect(readCategoryArchiveColumns('1')).toBe(1);
	});

	it('normalizeCategoryDefinition zachowuje archiveLayout title-list', () => {
		const item = normalizeCategoryDefinition({
			slug: 'zarządzenia',
			name: 'Zarządzenia',
			archiveLayout: 'title-list',
			archiveColumns: 2,
		});
		expect(item?.archiveLayout).toBe('title-list');
		expect(item?.archiveColumns).toBeUndefined();
	});

	it('applyCategoryArchiveFieldsFromForm ustawia kolumny tylko dla kafelków', () => {
		const tiles: CategoryDefinition = { slug: 'a', name: 'A' };
		applyCategoryArchiveFieldsFromForm(tiles, 'tiles', '3');
		expect(tiles.archiveLayout).toBe('tiles');
		expect(tiles.archiveColumns).toBe(3);

		const list: CategoryDefinition = { slug: 'b', name: 'B' };
		applyCategoryArchiveFieldsFromForm(list, 'title-list', '2');
		expect(list.archiveLayout).toBe('title-list');
		expect(list.archiveColumns).toBeUndefined();
	});

	it('resolveCategoryArchiveSettings zwraca domyślne kafelki 2 kolumny', () => {
		expect(resolveCategoryArchiveSettings({})).toEqual({ layout: 'tiles', columns: 2 });
	});
});

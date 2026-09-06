import { describe, expect, it } from 'vitest';
import {
	allPostCategorySlugs,
	extraCategoryNames,
	normalizeExtraCategorySlugs,
	parseExtraCategorySlugs,
} from './category-model';

const allowed = new Set(['aktualnosci', 'mazowsze-bez-smogu', 'zarzadzenia']);

describe('parseExtraCategorySlugs', () => {
	it('zbiera zaznaczone checkboxy i pomija puste', () => {
		const form = new FormData();
		form.append('extra_category_slug', 'aktualnosci');
		form.append('extra_category_slug', '');
		form.append('extra_category_slug', 'zarzadzenia');
		expect(parseExtraCategorySlugs(form)).toEqual(['aktualnosci', 'zarzadzenia']);
	});
});

describe('normalizeExtraCategorySlugs', () => {
	it('usuwa główną, nieznane i duplikaty', () => {
		expect(
			normalizeExtraCategorySlugs(
				['aktualnosci', 'mazowsze-bez-smogu', 'aktualnosci', 'brak', ''],
				'mazowsze-bez-smogu',
				allowed,
			),
		).toEqual(['aktualnosci']);
	});
});

describe('allPostCategorySlugs', () => {
	it('stawia główną na początku i nie dubluje', () => {
		expect(allPostCategorySlugs('mazowsze-bez-smogu', ['aktualnosci', 'mazowsze-bez-smogu'])).toEqual(
			['mazowsze-bez-smogu', 'aktualnosci'],
		);
	});
});

describe('extraCategoryNames', () => {
	it('mapuje slug na nazwę, nieznany zostawia', () => {
		expect(
			extraCategoryNames(['aktualnosci', 'x'], [{ slug: 'aktualnosci', name: 'Aktualności' }]),
		).toEqual(['Aktualności', 'x']);
	});
});

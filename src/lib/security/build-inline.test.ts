import { describe, expect, it } from 'vitest';
// helper buildu w JS, współdzielony z astro.config.mjs
import { assetsInlineLimit } from '../../../scripts/lib/build-inline.mjs';

describe('assetsInlineLimit', () => {
	it('nigdy nie wstawia skryptów inline (CSP bez unsafe-inline)', () => {
		expect(assetsInlineLimit('_astro/UserCreateDialog.astro_astro_type_script_index_0.js')).toBe(
			false,
		);
	});

	it('dla pozostałych assetów zostawia domyślny próg Vite', () => {
		expect(assetsInlineLimit('_astro/logo.svg')).toBeUndefined();
		expect(assetsInlineLimit('_astro/global.css')).toBeUndefined();
	});
});

/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
	applyExtraCategoryDraftValue,
	readExtraCategoryDraftValue,
	syncExtraCategoryOptions,
} from './extra-categories';

function mount(): HTMLFormElement {
	document.body.innerHTML = `
		<form>
			<select name="category_slug">
				<option value="mazowsze-bez-smogu" selected></option>
				<option value="aktualnosci"></option>
			</select>
			<label data-extra="aktualnosci"><input type="checkbox" name="extra_category_slug" value="aktualnosci" /></label>
			<label data-extra="mazowsze-bez-smogu"><input type="checkbox" name="extra_category_slug" value="mazowsze-bez-smogu" /></label>
		</form>
	`;
	return document.querySelector('form')!;
}

describe('extra-categories', () => {
	it('ukrywa dodatkową, która jest już główną', () => {
		const form = mount();
		syncExtraCategoryOptions(form);
		const primaryExtra = form.querySelector<HTMLInputElement>(
			'input[value="mazowsze-bez-smogu"]',
		)!;
		expect(primaryExtra.disabled).toBe(true);
		expect(primaryExtra.closest('label')?.classList.contains('hidden')).toBe(true);
		expect(form.querySelector<HTMLInputElement>('input[value="aktualnosci"]')!.disabled).toBe(
			false,
		);
	});

	it('czyta i przywraca zaznaczenie dodatkowych', () => {
		const form = mount();
		applyExtraCategoryDraftValue(form, 'aktualnosci');
		expect(readExtraCategoryDraftValue(form)).toBe('aktualnosci');
	});
});

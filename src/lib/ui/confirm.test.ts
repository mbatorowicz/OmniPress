import { describe, expect, it, vi } from 'vitest';
import { confirmAction } from './confirm';

describe('confirmAction', () => {
	it('zastępuje {n} liczbą', () => {
		const confirm = vi.fn(() => true);
		vi.stubGlobal('confirm', confirm);
		confirmAction('Usunąć {n} wpisów?', 3);
		expect(confirm).toHaveBeenCalledWith('Usunąć 3 wpisów?');
		vi.unstubAllGlobals();
	});

	it('zwraca wynik confirm', () => {
		vi.stubGlobal('confirm', () => false);
		expect(confirmAction('Na pewno?')).toBe(false);
		vi.unstubAllGlobals();
	});
});

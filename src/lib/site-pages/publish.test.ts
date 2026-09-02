import { describe, expect, it } from 'vitest';
import { shouldRefusePublish } from '@/lib/sync/policy';

describe('publikacja strony — ochrona origin', () => {
	it('odmawia gdy remote jest bogatszy a Omni puste', () => {
		expect(shouldRefusePublish('', '[📄 plik](./a.pdf)')).toBe(true);
	});

	it('pozwala gdy remote nie istnieje', () => {
		expect(shouldRefusePublish('', null)).toBe(false);
	});

	it('pozwala gdy Omni ma własną treść', () => {
		expect(shouldRefusePublish('Nowa wersja', 'Stara wersja')).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { parseInboundSubject } from './parse-subject';

describe('parseInboundSubject', () => {
	it('zdejmuje Re / Fwd / Odp / FW i zostawia tytuł', () => {
		expect(parseInboundSubject('Re: Festyn gminny')).toBe('Festyn gminny');
		expect(parseInboundSubject('RE: Festyn gminny')).toBe('Festyn gminny');
		expect(parseInboundSubject('Fwd: Festyn gminny')).toBe('Festyn gminny');
		expect(parseInboundSubject('FW: Festyn gminny')).toBe('Festyn gminny');
		expect(parseInboundSubject('Odp: Festyn gminny')).toBe('Festyn gminny');
		expect(parseInboundSubject('Odp.: Festyn gminny')).toBe('Festyn gminny');
	});

	it('zdejmuje stos prefiksów', () => {
		expect(parseInboundSubject('Re: Fwd: Odp: FW: Harmonogram')).toBe('Harmonogram');
	});

	it('zdejmuje emoji jak preparePlainTitle', () => {
		expect(parseInboundSubject('Re: 📅 Festyn')).toBe('Festyn');
	});

	it('pusty temat i sam prefiks dają pusty tytuł', () => {
		expect(parseInboundSubject('')).toBe('');
		expect(parseInboundSubject('   ')).toBe('');
		expect(parseInboundSubject(null)).toBe('');
		expect(parseInboundSubject('Re:')).toBe('');
		expect(parseInboundSubject('Re: Fwd:')).toBe('');
	});
});

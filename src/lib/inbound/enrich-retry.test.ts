import { describe, expect, it } from 'vitest';
import { inboundAi } from '@/i18n';
import { enrichRetrySystem } from './enrich-retry';

describe('enrichRetrySystem', () => {
	it('nie wraca, gdy liczba wpisów zgadza się z sygnałem', () => {
		expect(enrichRetrySystem(2, 2)).toBeNull();
		expect(enrichRetrySystem(0, 1)).toBeNull();
	});

	it('rozdziela albo scala w zależności od kierunku błędu', () => {
		expect(enrichRetrySystem(2, 1)).toContain(inboundAi.splitRetry.replace('{n}', '2'));
		expect(enrichRetrySystem(2, 3)).toContain(
			inboundAi.mergeRetry.replace('{n}', '2').replace('{got}', '3'),
		);
	});
});

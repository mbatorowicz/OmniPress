import { describe, expect, it } from 'vitest';
import { decideReconcile, hashPublishedContent } from '@/lib/sync/policy';

describe('import wpisów — ochrona workflow', () => {
	it('nie ciągnie draft/pending/rejected z treścią', () => {
		const current = hashPublishedContent('Szkic redaktora');
		for (const status of ['draft', 'pending', 'rejected', 'scheduled'] as const) {
			expect(
				decideReconcile({
					omniExists: true,
					omniContent: 'Szkic redaktora',
					workflowStatus: status,
					liveBlobSha: 'new',
					storedLiveBlobSha: 'old',
					publishedContentSha: current,
					currentContentSha: current,
				}),
			).toBe('keep');
		}
	});
});

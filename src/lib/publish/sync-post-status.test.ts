import { describe, expect, it } from 'vitest';
import { derivePostStatusFromLogStatuses } from './sync-post-status';

describe('derivePostStatusFromLogStatuses', () => {
	it('success → published', () => {
		expect(derivePostStatusFromLogStatuses(['success', 'failed'], 'publishing')).toBe('published');
	});

	it('pending → publishing', () => {
		expect(derivePostStatusFromLogStatuses(['pending'], 'publishing')).toBe('publishing');
	});

	it('ignoruje draft/pending post', () => {
		expect(derivePostStatusFromLogStatuses(['success'], 'pending')).toBeNull();
	});
});

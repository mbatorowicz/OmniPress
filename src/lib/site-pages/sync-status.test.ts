import { describe, expect, it } from 'vitest';
import { hashPublishedContent } from '@/lib/sync/policy';
import { pageDraftLiveStatus } from './sync-status';

const published = hashPublishedContent('Na stronie');

describe('pageDraftLiveStatus', () => {
	it('szkic jest draft_ahead', () => {
		expect(
			pageDraftLiveStatus({
				status: 'draft',
				content_md: 'Robocze',
				live_blob_sha: null,
				published_content_sha: null,
			}),
		).toBe('draft_ahead');
	});

	it('opublikowana bez lokalnych zmian jest in_sync', () => {
		expect(
			pageDraftLiveStatus({
				status: 'published',
				content_md: 'Na stronie',
				live_blob_sha: 'abc',
				published_content_sha: published,
			}),
		).toBe('in_sync');
	});

	it('wykrywa live_ahead gdy blob na origin jest inny', () => {
		expect(
			pageDraftLiveStatus(
				{
					status: 'published',
					content_md: 'Na stronie',
					live_blob_sha: 'old',
					published_content_sha: published,
				},
				'new',
			),
		).toBe('live_ahead');
	});
});

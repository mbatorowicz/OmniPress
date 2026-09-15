import { describe, expect, it } from 'vitest';
import { createSupabaseFake, hasEq } from '@/lib/testing/supabase-fake';
import { existingFromIndex, loadExistingPostIndex, resolveExistingPost } from './import-existing';
import type { ExistingPostIndex } from './import-existing';

function indexWith(postId: string, slug: string, externalId: string): ExistingPostIndex {
	const post = {
		id: postId,
		status: 'published',
		content_md: 'Treść',
		live_blob_sha: 'sha',
		published_content_sha: 'hash',
	};
	return {
		byId: new Map([[postId, post]]),
		idBySlug: new Map([[slug, postId]]),
		idByExternal: new Map([[externalId, postId]]),
	};
}

describe('existingFromIndex', () => {
	it('paruje po external_id, a gdy brak — po slugu', () => {
		const index = indexWith('p1', 'wpis', 'github:src/content/news/wpis/index.md');
		expect(existingFromIndex(index, 'github:src/content/news/wpis/index.md', 'inny').existingId).toBe(
			'p1',
		);
		expect(existingFromIndex(index, 'github:brak', 'wpis').existingId).toBe('p1');
		expect(existingFromIndex(index, 'github:brak', 'nie-ma').existingId).toBeNull();
	});
});

describe('loadExistingPostIndex', () => {
	it('zbiera wpisy i logi w dwóch zapytaniach, nie per plik', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts') {
				return {
					data: [
						{
							id: 'p1',
							slug: 'wpis',
							status: 'published',
							content_md: 'A',
							live_blob_sha: 's',
							published_content_sha: 'h',
						},
					],
				};
			}
			if (op.table === 'publish_logs') {
				return { data: [{ post_id: 'p1', external_id: 'github:src/content/news/wpis/index.md' }] };
			}
			return { data: null };
		});

		const index = await loadExistingPostIndex(fake.client, 'site-1', 'dest-1');
		expect(index.byId.size).toBe(1);
		expect(existingFromIndex(index, 'github:src/content/news/wpis/index.md', 'wpis').existingId).toBe(
			'p1',
		);
		expect(fake.calls.filter((op) => op.table === 'posts')).toHaveLength(1);
		expect(fake.calls.filter((op) => op.table === 'publish_logs')).toHaveLength(1);
		expect(hasEq(fake.calls[0]!, 'site_id', 'site-1')).toBe(true);
	});
});

describe('resolveExistingPost', () => {
	it('przy indeksie nie pyta bazy', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		const index = indexWith('p1', 'wpis', 'github:x');
		const resolved = await resolveExistingPost(
			fake.client,
			'site-1',
			'dest-1',
			'github:x',
			'wpis',
			index,
		);
		expect(resolved.existingId).toBe('p1');
		expect(fake.calls).toHaveLength(0);
	});
});

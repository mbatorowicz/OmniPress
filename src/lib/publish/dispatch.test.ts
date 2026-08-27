import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import type { DestinationForPublish, PostForPublish } from './types';

const publishToGitHubAstro = vi.hoisted(() => vi.fn());
vi.mock('./github-astro', () => ({ publishToGitHubAstro }));

const { dispatchPublish, loadDestinationForPublish, loadPostForPublish } = await import('./dispatch');

const post = { id: 'post-1', site_id: 'site-1' } as PostForPublish;

function destination(type: DestinationForPublish['type']): DestinationForPublish {
	return {
		id: 'dest-1',
		name: 'Strona gminy',
		type,
		config: { repo: 'owner/repo' },
		encrypted_credentials: 'enc',
		is_active: true,
	};
}

beforeEach(() => {
	publishToGitHubAstro.mockReset();
});

describe('dispatchPublish', () => {
	it('kieruje github_astro do publikacji w repo Astro', async () => {
		publishToGitHubAstro.mockResolvedValue({ ok: true, externalId: 'ext', summary: 'OK' });
		const fake = createSupabaseFake();
		const result = await dispatchPublish(fake.client, post, destination('github_astro'), 'ext-0');
		expect(result).toEqual({ ok: true, externalId: 'ext', summary: 'OK' });
		expect(publishToGitHubAstro).toHaveBeenCalledWith(
			fake.client,
			post,
			destination('github_astro'),
			'ext-0',
		);
	});

	it('nieobsługiwany typ destynacji kończy się błędem bez ponowień', async () => {
		const fake = createSupabaseFake();
		const result = await dispatchPublish(fake.client, post, destination('wordpress'));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.retryable).toBe(false);
		expect(publishToGitHubAstro).not.toHaveBeenCalled();
	});
});

describe('loadPostForPublish', () => {
	it('pobiera wpis po id', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'post-1' } }));
		expect(await loadPostForPublish(fake.client, 'post-1')).toEqual({ id: 'post-1' });
		expect(fake.calls[0]!.table).toBe('posts');
		expect(hasEq(fake.calls[0]!, 'id', 'post-1')).toBe(true);
	});

	it('zwraca null, gdy wpis zniknął przed publikacją', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		expect(await loadPostForPublish(fake.client, 'post-1')).toBeNull();
	});

	it('czyta pola wymagane przez front-matter repo Astro', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		await loadPostForPublish(fake.client, 'post-1');
		const columns = String(stepArgs(fake.calls[0]!, 'select')?.[0] ?? '');
		for (const column of [
			'title',
			'slug',
			'content_md',
			'category_slug',
			'category_name',
			'pinned',
			'scheduled_publish_at',
		]) {
			expect(columns).toContain(column);
		}
	});
});

describe('loadDestinationForPublish', () => {
	it('pobiera destynację po id', async () => {
		const fake = createSupabaseFake(() => ({ data: { id: 'dest-1' } }));
		expect(await loadDestinationForPublish(fake.client, 'dest-1')).toEqual({ id: 'dest-1' });
		expect(fake.calls[0]!.table).toBe('destinations');
		expect(hasEq(fake.calls[0]!, 'id', 'dest-1')).toBe(true);
	});

	it('czyta konfigurację i zaszyfrowane poświadczenia', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		await loadDestinationForPublish(fake.client, 'dest-1');
		const columns = String(stepArgs(fake.calls[0]!, 'select')?.[0] ?? '');
		expect(columns).toContain('config');
		expect(columns).toContain('encrypted_credentials');
	});

	it('zwraca null, gdy destynacja została usunięta', async () => {
		const fake = createSupabaseFake(() => ({ data: null }));
		expect(await loadDestinationForPublish(fake.client, 'dest-1')).toBeNull();
	});
});

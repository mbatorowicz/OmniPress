import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { appendSlugSuffix, resolveUniquePostSlug } from './slug-unique';

describe('appendSlugSuffix', () => {
	it('dopina numer', () => {
		expect(appendSlugSuffix('swieto-narodowe', 2)).toBe('swieto-narodowe-2');
	});

	it('obcina bazę przy limicie 80 znaków', () => {
		const base = 'a'.repeat(80);
		const result = appendSlugSuffix(base, 2);
		expect(result.length).toBe(80);
		expect(result.endsWith('-2')).toBe(true);
	});
});

function mockSupabaseWithSlugs(occupied: Map<string, string>): SupabaseClient {
	const isAvailable = (slug: string, excludePostId?: string) => {
		const ownerId = occupied.get(slug);
		if (!ownerId) return { data: null };
		if (excludePostId && ownerId === excludePostId) return { data: null };
		return { data: { id: ownerId } };
	};

	const slugChain = (slug: string) => ({
		limit: vi.fn().mockReturnValue({
			neq: vi.fn().mockImplementation((_col: string, excludePostId: string) => ({
				maybeSingle: vi.fn().mockImplementation(async () => isAvailable(slug, excludePostId)),
			})),
			maybeSingle: vi.fn().mockImplementation(async () => isAvailable(slug)),
		}),
	});

	return {
		from: vi.fn(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockImplementation((_col: string, val: string) => {
					if (val === 'site-1') {
						return {
							eq: vi.fn().mockImplementation((_col2: string, slug: string) => slugChain(slug)),
						};
					}
					return slugChain(val);
				}),
			}),
		})),
	} as unknown as SupabaseClient;
}

describe('resolveUniquePostSlug', () => {
	it('zwraca bazę gdy wolna', async () => {
		const supabase = mockSupabaseWithSlugs(new Map());
		await expect(resolveUniquePostSlug(supabase, 'site-1', 'tytul')).resolves.toBe('tytul');
	});

	it('dopina -2 przy kolizji', async () => {
		const supabase = mockSupabaseWithSlugs(new Map([['tytul', 'other-post']]));
		await expect(resolveUniquePostSlug(supabase, 'site-1', 'tytul', 'post-new')).resolves.toBe(
			'tytul-2',
		);
	});

	it('pomija własny wpis przy excludePostId', async () => {
		const supabase = mockSupabaseWithSlugs(new Map([['tytul', 'post-1']]));
		await expect(resolveUniquePostSlug(supabase, 'site-1', 'tytul', 'post-1')).resolves.toBe(
			'tytul',
		);
	});

	it('zwraca pusty slug bez zapytań', async () => {
		const supabase = mockSupabaseWithSlugs(new Map());
		await expect(resolveUniquePostSlug(supabase, 'site-1', '  ')).resolves.toBe('');
		expect(supabase.from).not.toHaveBeenCalled();
	});
});

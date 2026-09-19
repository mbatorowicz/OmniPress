import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, opsFor, stepArgs, type QueryOp } from '@/lib/testing/supabase-fake';

function hasMethod(op: QueryOp, method: string): boolean {
	return op.steps.some((step) => step.method === method);
}

const resolvePostCategoryFields = vi.hoisted(() => vi.fn());

vi.mock('@/lib/posts/category', () => ({ resolvePostCategoryFields }));

const { createInboundDraft } = await import('./create-draft');

const SITE = '11111111-1111-4111-8111-111111111111';
const AUTHOR = '22222222-2222-4222-8222-222222222222';
const POST = '44444444-4444-4444-8444-444444444444';
const MESSAGE = 'email_cat';

function insertPayload(fake: ReturnType<typeof createSupabaseFake>) {
	const op = opsFor(fake, 'posts').find((row: QueryOp) => hasMethod(row, 'insert'));
	return stepArgs(op!, 'insert')?.[0] as Record<string, unknown>;
}

describe('createInboundDraft — kategoria z Groka', () => {
	beforeEach(() => {
		resolvePostCategoryFields.mockReset();
		resolvePostCategoryFields.mockResolvedValue({
			category_slug: 'aktualnosci',
			category_name: 'Aktualności',
			extra_category_slugs: ['zarzadzenia'],
		});
	});

	it('dopisuje kategorię po resolvePostCategoryFields', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) return { data: { id: POST } };
			return { data: null };
		}, () => ({ data: AUTHOR }));

		expect(
			await createInboundDraft(fake.client, {
				messageId: MESSAGE,
				from: 'jan@urzad.pl',
				title: 'Festyn',
				contentMd: 'Zapraszamy.',
				siteSlug: 'gmina-miedzna',
				fallbackAuthorId: AUTHOR,
				categorySlug: 'aktualnosci',
				extraCategorySlugs: ['zarzadzenia'],
			}),
		).toMatchObject({ ok: true, created: true });

		expect(resolvePostCategoryFields).toHaveBeenCalledWith(
			fake.client,
			SITE,
			'aktualnosci',
			['zarzadzenia'],
		);
		expect(insertPayload(fake)).toMatchObject({
			category_slug: 'aktualnosci',
			category_name: 'Aktualności',
			extra_category_slugs: ['zarzadzenia'],
			status: 'draft',
		});
	});

	it('gdy resolve zwraca null, szkic bez kategorii', async () => {
		resolvePostCategoryFields.mockResolvedValue(null);
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) return { data: { id: POST } };
			return { data: null };
		}, () => ({ data: AUTHOR }));

		await createInboundDraft(fake.client, {
			messageId: MESSAGE,
			from: 'jan@urzad.pl',
			title: 'Festyn',
			contentMd: 'Zapraszamy.',
			siteSlug: 'gmina-miedzna',
			fallbackAuthorId: AUTHOR,
			categorySlug: 'haker',
		});
		expect(insertPayload(fake).category_slug).toBeUndefined();
	});
});

import { describe, expect, it } from 'vitest';
import {
	createSupabaseFake,
	hasEq,
	opsFor,
	stepArgs,
	type QueryOp,
} from '@/lib/testing/supabase-fake';
import { forgetPreviousInbound, siblingCreatedRange } from './forget-previous';

const EMAIL = '2e7fa3e9-d2a4-463c-9373-89867dfe3617';
const ANCHOR = '11111111-1111-4111-8111-111111111111';
const SISTER = '22222222-2222-4222-8222-222222222222';
const AUTHOR = '33333333-3333-4333-8333-333333333333';
const SITE = '44444444-4444-4444-8444-444444444444';
const CREATED = '2026-09-19T22:00:00.000Z';

function hasMethod(op: QueryOp, method: string): boolean {
	return op.steps.some((step) => step.method === method);
}

describe('siblingCreatedRange', () => {
	it('bierze wąskie okno wokół utworzenia kotwicy', () => {
		const range = siblingCreatedRange(CREATED);
		expect(Date.parse(range.lte) - Date.parse(range.gte)).toBe(10_000);
		expect(Date.parse(CREATED)).toBeGreaterThan(Date.parse(range.gte));
		expect(Date.parse(CREATED)).toBeLessThan(Date.parse(range.lte));
	});
});

describe('forgetPreviousInbound', () => {
	it('kasuje kotwicę i siostrzane szkice z tego samego ingestu', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'inbound_messages') return { data: { post_id: ANCHOR } };
			if (op.table === 'posts' && hasMethod(op, 'maybeSingle')) {
				return {
					data: {
						id: ANCHOR,
						author_id: AUTHOR,
						site_id: SITE,
						created_at: CREATED,
						status: 'draft',
					},
				};
			}
			if (op.table === 'posts' && hasMethod(op, 'select') && !hasMethod(op, 'delete')) {
				return { data: [{ id: ANCHOR }, { id: SISTER }] };
			}
			if (op.table === 'assets') return { data: [] };
			return { data: null };
		});

		await forgetPreviousInbound(EMAIL, fake.client);

		const del = opsFor(fake, 'posts').find((op) => hasMethod(op, 'delete'));
		expect(hasEq(opsFor(fake, 'inbound_messages')[0]!, 'message_id', EMAIL)).toBe(true);
		expect(stepArgs(del!, 'in')?.[0]).toBe('id');
		expect(stepArgs(del!, 'in')?.[1]).toEqual([ANCHOR, SISTER]);
	});
});

import { describe, expect, it } from 'vitest';
import {
	createSupabaseFake,
	hasEq,
	opsFor,
	stepArgs,
	type QueryOp,
} from '@/lib/testing/supabase-fake';
import { createInboundDraft, type CreateInboundDraftInput } from './create-draft';

const SITE = '11111111-1111-4111-8111-111111111111';
const AUTHOR = '22222222-2222-4222-8222-222222222222';
const FALLBACK = '33333333-3333-4333-8333-333333333333';
const POST = '44444444-4444-4444-8444-444444444444';
const EXISTING = '55555555-5555-4555-8555-555555555555';
const MESSAGE = 'email_abc';

const INPUT: CreateInboundDraftInput = {
	messageId: ` ${MESSAGE} `,
	from: 'Jan Kowalski <Jan.Kowalski@Urzad.PL>',
	siteSlug: ' gmina-miedzna ',
	fallbackAuthorId: FALLBACK,
	drafts: [{ title: 'Festyn gminny', contentMd: 'Zapraszamy.' }],
};

function hasMethod(op: QueryOp, method: string): boolean {
	return op.steps.some((step) => step.method === method);
}

function insertPayload(fake: ReturnType<typeof createSupabaseFake>, table: string) {
	const op = opsFor(fake, table).find((row) => hasMethod(row, 'insert'));
	return stepArgs(op!, 'insert')?.[0] as Record<string, unknown>;
}

describe('createInboundDraft', () => {
	it('nowy mail: szkic draft bez kategorii i wiersz inbound', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) return { data: { id: POST } };
			return { data: null };
		}, (fn, args) => {
			expect(fn).toBe('inbound_author_id');
			expect(args).toEqual({ p_email: 'jan.kowalski@urzad.pl' });
			return { data: AUTHOR };
		});

		expect(await createInboundDraft(fake.client, INPUT)).toEqual({
			ok: true,
			postId: POST,
			postIds: [POST],
			created: true,
		});
		expect(insertPayload(fake, 'posts')).toEqual({
			author_id: AUTHOR,
			site_id: SITE,
			title: 'Festyn gminny',
			content_md: 'Zapraszamy.',
			status: 'draft',
		});
		expect(insertPayload(fake, 'inbound_messages')).toEqual({
			message_id: MESSAGE,
			from_email: 'jan.kowalski@urzad.pl',
			post_id: POST,
		});
		expect(hasEq(opsFor(fake, 'sites')[0]!, 'slug', 'gmina-miedzna')).toBe(true);
		expect(hasEq(opsFor(fake, 'sites')[0]!, 'is_active', true)).toBe(true);
	});

	it('retry z tym samym message_id zwraca istniejacy post i nic nie wstawia', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'inbound_messages') return { data: { post_id: EXISTING } };
			throw new Error(`unexpected table ${op.table}`);
		});

		expect(await createInboundDraft(fake.client, INPUT)).toEqual({
			ok: true,
			postId: EXISTING,
			postIds: [EXISTING],
			created: false,
		});
		expect(opsFor(fake, 'posts')).toHaveLength(0);
		expect(opsFor(fake, 'inbound_messages').every((op) => !hasMethod(op, 'insert'))).toBe(true);
	});

	it('UNIQUE na inbound sprząta osierocony szkic i zwraca istniejacy post_id', async () => {
		let inboundLookups = 0;
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) return { data: { id: POST } };
			if (op.table === 'inbound_messages' && hasMethod(op, 'insert')) {
				return { error: { code: '23505' } };
			}
			if (op.table === 'inbound_messages') {
				inboundLookups += 1;
				return inboundLookups === 1 ? { data: null } : { data: { post_id: EXISTING } };
			}
			return { data: null };
		}, () => ({ data: AUTHOR }));

		expect(await createInboundDraft(fake.client, INPUT)).toEqual({
			ok: true,
			postId: EXISTING,
			postIds: [EXISTING],
			created: false,
		});
		const del = opsFor(fake, 'posts').find((op) => hasMethod(op, 'delete'));
		expect(hasEq(del!, 'id', POST)).toBe(true);
	});

	it('brak strony / autora / zly From — bez insertu wpisu', async () => {
		const noSite = createSupabaseFake(() => ({ data: null }), () => ({ data: AUTHOR }));
		expect(await createInboundDraft(noSite.client, INPUT)).toEqual({
			ok: false,
			error: 'no_site',
		});
		expect(opsFor(noSite, 'posts')).toHaveLength(0);

		const noAuthor = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			return { data: null };
		}, () => ({ data: null }));
		expect(
			await createInboundDraft(noAuthor.client, { ...INPUT, fallbackAuthorId: '  ' }),
		).toEqual({ ok: false, error: 'no_author' });
		expect(opsFor(noAuthor, 'posts')).toHaveLength(0);

		const badFrom = createSupabaseFake();
		expect(await createInboundDraft(badFrom.client, { ...INPUT, from: 'nie-mail' })).toEqual({
			ok: false,
			error: 'invalid_from',
		});
		expect(await createInboundDraft(badFrom.client, { ...INPUT, messageId: '  ' })).toEqual({
			ok: false,
			error: 'invalid_message',
		});
	});

	it('gdy profil nie istnieje, bierze INBOUND_FALLBACK_AUTHOR_ID', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) return { data: { id: POST } };
			return { data: null };
		}, () => ({ data: null }));

		expect(await createInboundDraft(fake.client, INPUT)).toMatchObject({
			ok: true,
			created: true,
		});
		expect(insertPayload(fake, 'posts').author_id).toBe(FALLBACK);
	});

	it('dwa szkice: dwa inserty posts, inbound wskazuje pierwszy', async () => {
		const second = '66666666-6666-4666-8666-666666666666';
		let posts = 0;
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { id: SITE } };
			if (op.table === 'posts' && hasMethod(op, 'insert')) {
				posts += 1;
				return { data: { id: posts === 1 ? POST : second } };
			}
			return { data: null };
		}, () => ({ data: AUTHOR }));

		expect(
			await createInboundDraft(fake.client, {
				...INPUT,
				drafts: [
					{ title: 'Szczepienia', contentMd: 'A' },
					{ title: 'Wścieklizna', contentMd: 'B' },
				],
			}),
		).toEqual({
			ok: true,
			postId: POST,
			postIds: [POST, second],
			created: true,
		});
		expect(insertPayload(fake, 'inbound_messages')).toMatchObject({ post_id: POST });
	});
});

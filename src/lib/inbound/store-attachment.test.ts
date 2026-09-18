import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { saveInboundDraftContent, storeInboundAttachment } from './store-attachment';

type StoreFake = {
	client: SupabaseClient;
	uploads: { path: string; mime: string }[];
	inserts: Record<string, unknown>[];
	removed: string[][];
	updates: Record<string, unknown>[];
};

function fakeClient(opts: { uploadError?: unknown; insertError?: unknown } = {}): StoreFake {
	const uploads: { path: string; mime: string }[] = [];
	const inserts: Record<string, unknown>[] = [];
	const removed: string[][] = [];
	const updates: Record<string, unknown>[] = [];
	const client = {
		storage: {
			from: () => ({
				upload: async (path: string, _bytes: Uint8Array, init: { contentType: string }) => {
					uploads.push({ path, mime: init.contentType });
					return { error: opts.uploadError ?? null };
				},
				remove: async (paths: string[]) => {
					removed.push(paths);
					return { error: null };
				},
			}),
		},
		from: (table: string) => {
			if (table === 'assets') {
				return {
					insert: (row: Record<string, unknown>) => {
						inserts.push(row);
						return Promise.resolve({ error: opts.insertError ?? null });
					},
					select: () => ({
						eq: () => ({
							order: () => ({
								limit: () => ({
									maybeSingle: async () => ({ data: { sort_order: 3 } }),
								}),
							}),
						}),
					}),
				};
			}
			return {
				update: (row: Record<string, unknown>) => {
					updates.push(row);
					return { eq: async () => ({ error: null }) };
				},
			};
		},
	} as unknown as SupabaseClient;
	return { client, uploads, inserts, removed, updates };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const POST = '44444444-4444-4444-8444-444444444444';

describe('storeInboundAttachment', () => {
	it('wgrywa do post-assets i wstawia wiersz assets', async () => {
		const fake = fakeClient();
		await expect(
			storeInboundAttachment(fake.client, {
				postId: POST,
				filename: 'foto.png',
				mime: 'image/png',
				kind: 'gallery',
				bytes: PNG,
			}),
		).resolves.toBe(true);
		expect(fake.uploads[0]?.path.startsWith(`${POST}/`)).toBe(true);
		expect(fake.uploads[0]?.path.endsWith('.png')).toBe(true);
		expect(fake.inserts[0]).toMatchObject({
			post_id: POST,
			filename: 'foto.png',
			mime_type: 'image/png',
			sort_order: 4,
		});
	});

	it('przy bledzie insertu sprząta Storage; upload fail nie insertuje', async () => {
		const uploadFail = fakeClient({ uploadError: { message: 'nope' } });
		await expect(
			storeInboundAttachment(uploadFail.client, {
				postId: POST,
				filename: 'foto.png',
				mime: 'image/png',
				kind: 'gallery',
				bytes: PNG,
			}),
		).resolves.toBe(false);
		expect(uploadFail.inserts).toHaveLength(0);

		const insertFail = fakeClient({ insertError: { message: 'nope' } });
		await expect(
			storeInboundAttachment(insertFail.client, {
				postId: POST,
				filename: 'a.pdf',
				mime: 'application/pdf',
				kind: 'pdf',
				bytes: PNG,
			}),
		).resolves.toBe(false);
		expect(insertFail.removed[0]?.[0]?.startsWith(`${POST}/`)).toBe(true);
	});

	it('saveInboundDraftContent aktualizuje content_md', async () => {
		const fake = fakeClient();
		await saveInboundDraftContent(fake.client, POST, 'notatka');
		expect(fake.updates).toEqual([{ content_md: 'notatka' }]);
	});
});

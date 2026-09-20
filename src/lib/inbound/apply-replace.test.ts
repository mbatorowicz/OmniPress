import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyInboundReplace } from './apply-replace';

const POST = '44444444-4444-4444-8444-444444444444';
const SITE = '11111111-1111-4111-8111-111111111111';
const ASSET = '55555555-5555-4555-8555-555555555555';
const PDF = new Uint8Array([1, 2, 3, 4]);

function fakeClient() {
	const uploads: string[] = [];
	const removed: string[][] = [];
	const updates: Record<string, unknown>[] = [];
	const client = {
		storage: {
			from: () => ({
				upload: async (path: string) => {
					uploads.push(path);
					return { error: null };
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
					select: () => ({
						eq: () => ({
							order: async () => ({
								data: [
									{
										id: ASSET,
										storage_path: `${POST}/old.pdf`,
										filename: 'ulotka.pdf',
										display_mode: 'embed',
									},
								],
							}),
						}),
					}),
					update: (row: Record<string, unknown>) => {
						updates.push(row);
						return { eq: async () => ({ error: null }) };
					},
				};
			}
			if (table === 'posts') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({ data: { status: 'published' } }),
						}),
					}),
					update: () => ({
						eq: () => ({
							in: () => ({
								select: () => ({
									maybeSingle: async () => ({ data: { id: POST } }),
								}),
							}),
						}),
					}),
				};
			}
			return {};
		},
	} as unknown as SupabaseClient;
	return { client, uploads, removed, updates };
}

describe('applyInboundReplace', () => {
	it('wgrywa nowy plik, dopiero potem kasuje stary i otwiera poprawkę', async () => {
		const fake = fakeClient();
		const result = await applyInboundReplace(fake.client, {
			candidate: { kind: 'post', id: POST, siteId: SITE, title: 'Festyn' },
			inventory: [
				{
					filename: 'ulotka.pdf',
					mime: 'application/pdf',
					text: '',
					pageCount: 1,
					suggestedDisplay: 'link',
					bytes: PDF,
				},
			],
		});
		expect(result).toEqual({ ok: true, filename: 'ulotka.pdf' });
		expect(fake.uploads[0]?.startsWith(`${POST}/`)).toBe(true);
		expect(fake.updates[0]).toMatchObject({
			filename: 'ulotka.pdf',
			display_mode: 'embed',
		});
		expect(fake.removed[0]).toEqual([`${POST}/old.pdf`]);
	});
});

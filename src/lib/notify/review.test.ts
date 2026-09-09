import { describe, expect, it, vi } from 'vitest';
import { APP } from '@/config/app';
import { notify } from '@/i18n';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';
import { notifyPostSubmitted } from './review';

const POST = {
	id: '11111111-2222-3333-4444-555555555555',
	title: 'Komunikat',
	site_id: 'site-1',
	author_id: 'user-1',
};

describe('notifyPostSubmitted', () => {
	it('nie odczytuje bazy gdy Telegram nie jest skonfigurowany', async () => {
		const fake = createSupabaseFake();
		const send = vi.fn();
		await notifyPostSubmitted(fake.client, POST, { configured: false, send });
		expect(fake.calls).toHaveLength(0);
		expect(send).not.toHaveBeenCalled();
	});

	it('składa wiadomość z nazwy strony i autora i wysyła', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { name: 'UG Miedzna' } };
			if (op.table === 'profiles') return { data: { display_name: 'Anna Nowak' } };
			return { data: null };
		});
		const send = vi.fn().mockResolvedValue(undefined);

		await notifyPostSubmitted(fake.client, POST, { configured: true, send });

		expect(send).toHaveBeenCalledTimes(1);
		const text = send.mock.calls[0]![0] as string;
		expect(text).toContain(notify.review.heading);
		expect(text).toContain('Komunikat');
		expect(text).toContain('UG Miedzna');
		expect(text).toContain('Anna Nowak');
		expect(text).toContain(`${APP.productionOrigin}/admin/posts/${POST.id}`);
	});

	it('wysyła mimo braku profilu autora', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { name: 'UG' } };
			return { data: null };
		});
		const send = vi.fn().mockResolvedValue(undefined);

		await notifyPostSubmitted(
			fake.client,
			{ ...POST, author_id: null },
			{ configured: true, send },
		);

		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0]![0]).toContain(notify.review.authorUnknown);
	});

	it('nie rzuca gdy send padnie', async () => {
		const fake = createSupabaseFake(() => ({ data: { name: 'UG' } }));
		const send = vi.fn().mockRejectedValue(new Error('network'));
		await expect(
			notifyPostSubmitted(fake.client, POST, { configured: true, send }),
		).resolves.toBeUndefined();
	});
});

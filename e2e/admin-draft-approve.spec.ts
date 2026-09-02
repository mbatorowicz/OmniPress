import { test, expect } from '@playwright/test';
import { adminReview } from '@/i18n/pl/admin-review';
import { dashboard } from '@/i18n/pl/dashboard';
import { posts } from '@/i18n/pl/posts';
import { deletePostAsAdmin } from './helpers/posts';

/**
 * Administrator na szkicu, którego redaktor nie wysłał: panel publikacji jest dostępny,
 * ale blokowany do uzupełnienia tytułu i kategorii, a ścieżkę redaktora można domknąć
 * przyciskiem „Wyślij do akceptacji”. Sama publikacja nie jest klikana — commit szedłby
 * do repozytorium produkcyjnego strony.
 */
test.describe('szkic redaktora u administratora', () => {
	test('panel publikacji szkicu i wysłanie do akceptacji za redaktora', async ({
		page,
		baseURL,
	}) => {
		const title = `[E2E] Szkic admina ${Date.now()}`;

		await page.goto('/dashboard');
		await page.getByRole('button', { name: dashboard.articles.newPost }).click();
		await page.waitForURL(/\/dashboard\/posts\/[0-9a-f-]+$/);
		const postId = page.url().split('/').pop()!;

		try {
			const categoryOptions = page.locator('select[name="category_slug"] option:not([value=""])');
			if ((await categoryOptions.count()) === 0) {
				test.skip(true, 'Strona bez kategorii w repo Astro — pominięto publikację szkicu.');
			}
			const category = (await categoryOptions.first().getAttribute('value'))!;

			// Pusty szkic: przycisk publikacji jest, ale zablokowany brakiem tytułu.
			await page.goto(`/admin/posts/${postId}`);
			await expect(page.getByText(posts.status.draft).first()).toBeVisible();
			const approve = page.getByRole('button', { name: adminReview.approveDraft });
			await expect(approve).toBeVisible();
			await expect(approve).toBeDisabled();
			await expect(page.getByText(adminReview.notReady.title)).toBeVisible();

			const saved = await page.request.post(`/api/posts/${postId}/save`, {
				headers: { origin: baseURL! },
				form: { title, slug: '', category_slug: category, content_md: 'Treść testowa E2E.' },
				maxRedirects: 0,
			});
			expect(saved.status()).toBe(302);
			expect(saved.headers()['location']).toContain('saved=1');

			// Uzupełniony szkic można już opublikować (bez klikania — to commit na produkcję).
			await page.goto(`/admin/posts/${postId}`);
			await expect(page.getByRole('button', { name: adminReview.approveDraft })).toBeEnabled();

			// Druga droga: pełna ścieżka redaktora prowadzona przez administratora.
			page.on('dialog', (dialog) => dialog.accept());
			await page.goto(`/admin/posts/${postId}/edit`);
			await page.getByRole('button', { name: adminReview.submit }).click();

			await page.waitForURL(new RegExp(`/admin/posts/${postId}\\?submitted=1$`));
			await expect(page.getByText(adminReview.submitted)).toBeVisible();
			await expect(page.getByText(posts.status.pending).first()).toBeVisible();
			await expect(page.getByRole('button', { name: adminReview.approve })).toBeVisible();
		} finally {
			await deletePostAsAdmin(page, baseURL!, postId);
		}
	});
});

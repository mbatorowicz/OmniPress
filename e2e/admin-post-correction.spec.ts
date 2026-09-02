import { test, expect } from '@playwright/test';
import { adminReview } from '@/i18n/pl/admin-review';
import { dashboard } from '@/i18n/pl/dashboard';
import { posts } from '@/i18n/pl/posts';
import { deletePostAsAdmin } from './helpers/posts';

// Korekta administratora na wpisie czekającym na akceptację (status pending).
test.describe('korekta wpisu przez administratora', () => {
	test('poprawia treść wpisu do akceptacji bez zmiany statusu', async ({ page, baseURL }) => {
		const title = `[E2E] Korekta ${Date.now()}`;
		const corrected = `${title} po korekcie`;

		await page.goto('/dashboard');
		await page.getByRole('button', { name: dashboard.articles.newPost }).click();
		await page.waitForURL(/\/dashboard\/posts\/[0-9a-f-]+$/);
		const postId = page.url().split('/').pop()!;

		try {
			const categoryOptions = page.locator('select[name="category_slug"] option:not([value=""])');
			if ((await categoryOptions.count()) === 0) {
				test.skip(true, 'Strona bez kategorii w repo Astro — pominięto korektę.');
			}
			const category = (await categoryOptions.first().getAttribute('value'))!;

			const submitted = await page.request.post(`/api/posts/${postId}/submit`, {
				headers: { origin: baseURL! },
				form: { title, category_slug: category, content_md: 'Treść testowa E2E.' },
				maxRedirects: 0,
			});
			expect(submitted.status()).toBe(302);
			expect(submitted.headers()['location']).toContain('submitted=1');

			await page.goto(`/admin/posts/${postId}`);
			await expect(page.getByText(posts.status.pending).first()).toBeVisible();

			await page.getByRole('link', { name: adminReview.edit }).click();
			await page.waitForURL(new RegExp(`/admin/posts/${postId}/edit$`));
			await expect(page.getByRole('heading', { name: adminReview.editHeading })).toBeVisible();
			await expect(page.locator('input[name="title"]')).toHaveValue(title);

			await page.locator('input[name="title"]').fill(corrected);
			await page.getByRole('button', { name: adminReview.editSave }).click();

			await page.waitForURL(new RegExp(`/admin/posts/${postId}\\?saved=1$`));
			await expect(page.getByText(adminReview.edited)).toBeVisible();
			await expect(page.getByRole('heading', { name: corrected })).toBeVisible();
			// Korekta nie przesuwa wpisu w workflow — nadal czeka na akceptację.
			await expect(page.getByText(posts.status.pending).first()).toBeVisible();
		} finally {
			await deletePostAsAdmin(page, baseURL!, postId);
		}
	});
});

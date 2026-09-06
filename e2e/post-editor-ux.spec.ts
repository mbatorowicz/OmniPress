import { test, expect } from '@playwright/test';
import { dashboard } from '@/i18n/pl/dashboard';
import { deletePostAsAdmin } from './helpers/posts';

const ed = dashboard.editor;

/** Minimalny PNG 1×1 — tylko do UI uploadu, nie do publikacji. */
const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
);

test.describe('edytor — szkic w karcie i postęp uploadu', () => {
	test('odświeżenie przywraca pola; zdjęcie pokazuje miniaturę od razu', async ({ page, baseURL }) => {
		const title = `[E2E] Szkic karty ${Date.now()}`;

		await page.goto('/dashboard');
		await page.getByRole('button', { name: dashboard.articles.newPost }).click();
		await page.waitForURL(/\/dashboard\/posts\/[0-9a-f-]+$/);
		const postId = page.url().split('/').pop()!;

		try {
			const titleInput = page.locator('input[name="title"]');
			await titleInput.fill(title);
			await expect(titleInput).toHaveValue(title);
			await expect
				.poll(() => page.evaluate((id) => sessionStorage.getItem(`omnipress:post-draft:${id}`), postId))
				.toContain(title);

			await page.reload();
			await expect(titleInput).toHaveValue(title);
			await expect(page.getByText(ed.draftRestored)).toBeVisible();

			const fileInput = page.locator('[data-gallery-upload]');
			await fileInput.setInputFiles({
				name: 'miniatura-e2e.png',
				mimeType: 'image/png',
				buffer: TINY_PNG,
			});

			await expect(page.getByText('miniatura-e2e.png').first()).toBeVisible();
			await expect(page.locator('.ui-gallery-card img[alt="miniatura-e2e.png"]').first()).toBeVisible();
		} finally {
			await deletePostAsAdmin(page, baseURL!, postId);
		}
	});
});

import { test, expect } from '@playwright/test';
import { dashboard } from '@/i18n/pl/dashboard';
import { posts } from '@/i18n/pl/posts';
import { deletePostAsAdmin } from './helpers/posts';

const ed = dashboard.editor;

/** Data publikacji w przyszłości w formacie pola date (YYYY-MM-DD). */
function futureScheduleDate(): string {
	const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Integracja na żywym serwisie: szkic → walidacja → zapis → sprzątanie (usunięcie).
test.describe('cykl życia wpisu', () => {
	test('utworzenie szkicu, walidacja kategorii, zapis i usunięcie', async ({ page, baseURL }) => {
		const title = `[E2E] Test automatyczny ${Date.now()}`;

		await page.goto('/dashboard');
		await page.getByRole('button', { name: dashboard.articles.newPost }).click();
		await page.waitForURL(/\/dashboard\/posts\/[0-9a-f-]+$/);
		const postId = page.url().split('/').pop()!;

		try {
			await expect(page.getByRole('heading', { name: ed.headingEdit })).toBeVisible();
			await expect(page.getByText(posts.status.draft).first()).toBeVisible();

			// Zapis bez kategorii — API odrzuca (category_required).
			const invalidSave = await page.request.post(`/api/posts/${postId}/save`, {
				headers: { origin: baseURL! },
				form: { title, slug: '', category_slug: '', content_md: 'Treść testowa E2E.' },
				maxRedirects: 0,
			});
			expect(invalidSave.status()).toBe(302);
			expect(invalidSave.headers()['location']).toContain('error=category_required');

			// Zapis przez UI — wymaga kategorii z repo Astro tej strony.
			const categoryOptions = page.locator('select[name="category_slug"] option:not([value=""])');
			if ((await categoryOptions.count()) === 0) {
				test.info().annotations.push({
					type: 'skip-partial',
					description: 'Strona bez kategorii w repo Astro — pominięto zapis przez UI.',
				});
				return;
			}

			const firstCategory = await categoryOptions.first().getAttribute('value');
			await page.locator('select[name="category_slug"]').selectOption(firstCategory!);
			await page.locator('input[name="title"]').fill(title);
			await page.locator('input[name="scheduled_publish_date"]').fill(futureScheduleDate());
			await page.locator('select[name="scheduled_publish_hour"]').selectOption('12:00');
			await page.getByRole('button', { name: ed.actions.save }).click();

			await page.waitForURL(/saved=1/);
			await expect(page.getByText(ed.saved)).toBeVisible();
			await expect(page.locator('input[name="title"]')).toHaveValue(title);

			// Szkic widoczny na liście wpisów.
			await page.goto('/dashboard');
			await expect(page.getByRole('link', { name: title })).toBeVisible();
		} finally {
			await deletePostAsAdmin(page, baseURL!, postId);
		}

		// Po usunięciu wpis nie istnieje.
		await page.goto(`/dashboard/posts/${postId}`);
		await expect(page).toHaveURL(/error=not_found/);
	});
});

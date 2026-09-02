import { test, expect } from '@playwright/test';
import { adminAllPosts, postsBrowse } from '@/i18n/pl/posts-browse';
import { adminReview } from '@/i18n/pl/admin-review';
import { dashboard } from '@/i18n/pl/dashboard';
import { layout } from '@/i18n/pl/layout';
import { posts } from '@/i18n/pl/posts';

// Lista wpisów z filtrami — sesja ze storage state (projekt chromium).
test.describe('przeglądarka wpisów', () => {
	test('/admin/posts filtruje po statusie i sortuje po tytule', async ({ page }) => {
		await page.goto('/admin/posts');
		await expect(page.getByRole('heading', { name: adminAllPosts.heading })).toBeVisible();

		const filters = page.getByRole('form', { name: postsBrowse.filters.aria });
		await expect(filters.getByRole('button', { name: postsBrowse.filters.apply })).toBeVisible();

		// Zakładka statusu zawęża listę przez query param.
		await page
			.getByRole('navigation', { name: postsBrowse.filters.status })
			.getByRole('link', { name: new RegExp(posts.status.draft) })
			.click();
		await expect(page).toHaveURL(/status=draft/);

		// Filtr statusu w formularzu odzwierciedla adres.
		await expect(filters.locator('select[name="status"]')).toHaveValue('draft');

		// Klik w nagłówek kolumny ustawia sortowanie po tytule.
		const empty = page.getByText(postsBrowse.emptyFiltered);
		if (!(await empty.isVisible())) {
			await page.getByRole('link', { name: new RegExp(postsBrowse.columns.title) }).click();
			await expect(page).toHaveURL(/sort=title_asc/);
		}
	});

	test('/admin/posts szuka po tytule i czyści filtry', async ({ page }) => {
		await page.goto('/admin/posts');
		const filters = page.getByRole('form', { name: postsBrowse.filters.aria });

		await filters.getByLabel(postsBrowse.filters.search).fill('zzz-brak-takiego-wpisu');
		await filters.getByRole('button', { name: postsBrowse.filters.apply }).click();

		await expect(page).toHaveURL(/q=zzz-brak-takiego-wpisu/);
		await expect(page.getByText(postsBrowse.emptyFiltered)).toBeVisible();

		await page.getByRole('link', { name: postsBrowse.filters.clear }).click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
	});

	test('szkic redaktora otwiera się w edytorze administratora', async ({ page }) => {
		await page.goto('/admin/posts?status=draft');

		const editLinks = page.getByRole('link', { name: postsBrowse.actions.edit });
		if ((await editLinks.count()) === 0) {
			test.skip(true, 'Brak szkicu w bazie — nic do otwarcia.');
			return;
		}

		await editLinks.first().click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\/edit$/);
		await expect(page.getByRole('heading', { name: adminReview.editHeading })).toBeVisible();
	});

	test('sidebar prowadzi z kolejki do wszystkich wpisów', async ({ page }) => {
		await page.goto('/admin');
		await page
			.getByRole('navigation', { name: layout.aria.sidebarNav })
			.getByRole('link', { name: layout.sidebar.posts })
			.click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
	});

	test('/dashboard ma filtry własnych wpisów', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.getByText(dashboard.posts.heading)).toBeVisible();

		const filters = page.getByRole('form', { name: postsBrowse.filters.aria });
		await filters.locator('select[name="sort"]').selectOption('title_asc');
		await filters.getByRole('button', { name: postsBrowse.filters.apply }).click();

		await expect(page).toHaveURL(/sort=title_asc/);
	});
});

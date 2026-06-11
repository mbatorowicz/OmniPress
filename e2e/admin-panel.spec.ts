import { test, expect } from '@playwright/test';
import { admin } from '@/i18n/pl/admin';
import { adminEditors, adminSites, adminUnit } from '@/i18n/pl/admin-panels';
import { dashboard } from '@/i18n/pl/dashboard';
import { layout } from '@/i18n/pl/layout';

// Panel administratora — sesja ze storage state (projekt chromium).
test.describe('panel administratora', () => {
	test('/admin pokazuje kolejkę wpisów i nawigację sekcji', async ({ page }) => {
		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: admin.queueHeading })).toBeVisible();

		const queueNav = page.getByRole('navigation', { name: layout.aria.queueSections });
		for (const label of Object.values(admin.queueNav)) {
			await expect(queueNav.getByText(label)).toBeVisible();
		}

		const sidebar = page.getByRole('navigation', { name: layout.aria.sidebarNav });
		await expect(sidebar.getByRole('link', { name: layout.sidebar.queue })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: layout.sidebar.units })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: layout.sidebar.editors })).toBeVisible();
	});

	test('/admin/sites renderuje listę jednostek', async ({ page }) => {
		await page.goto('/admin/sites');
		await expect(page.getByRole('heading', { name: adminSites.title })).toBeVisible();
		await expect(page.getByRole('link', { name: adminSites.wizardLink })).toBeVisible();
	});

	test('/admin/editors renderuje panel redaktorów', async ({ page }) => {
		await page.goto('/admin/editors');
		await expect(page.getByRole('heading', { name: adminEditors.title })).toBeVisible();
		await expect(page.getByText(adminEditors.invite.heading)).toBeVisible();
		await expect(page.getByText(adminEditors.list.heading)).toBeVisible();
	});

	test('/admin/units/new renderuje kreator jednostki', async ({ page }) => {
		await page.goto('/admin/units/new');
		await expect(page.getByRole('heading', { name: adminUnit.title })).toBeVisible();
		await expect(page.getByRole('button', { name: adminUnit.actions.create })).toBeVisible();
	});

	test('/dashboard dostępny dla admina (tworzenie wpisów)', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.getByRole('heading', { name: dashboard.title })).toBeVisible();
		await expect(page.getByText(dashboard.posts.heading)).toBeVisible();
	});

	test('zalogowany admin na /login trafia z powrotem do /admin', async ({ page }) => {
		await page.goto('/login');
		await expect(page).toHaveURL(/\/admin$/);
	});
});

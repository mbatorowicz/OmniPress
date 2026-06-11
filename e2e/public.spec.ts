import { test, expect } from '@playwright/test';
import { api } from '@/i18n/pl/api';
import { auth } from '@/i18n/pl/auth';
import { common } from '@/i18n/pl/common';

// Strefa publiczna — bez sesji.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('strefa publiczna', () => {
	test('/ przekierowuje niezalogowanego na /login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
	});

	test('/login renderuje formularz logowania', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: common.appName })).toBeVisible();
		await expect(page.getByText(auth.login.headingSignIn)).toBeVisible();
		await expect(page.getByLabel(common.email)).toBeVisible();
		await expect(page.getByLabel(common.password)).toBeVisible();
		await expect(page.getByRole('button', { name: auth.login.submitSignIn })).toBeVisible();
		await expect(page.getByRole('link', { name: auth.login.forgotPassword })).toBeVisible();
	});

	test('/login?mode=reset renderuje formularz resetu hasła', async ({ page }) => {
		await page.goto('/login?mode=reset');
		await expect(page.getByText(auth.login.headingReset)).toBeVisible();
		await expect(page.getByLabel(common.email)).toBeVisible();
		await expect(page.getByRole('button', { name: auth.login.submitReset })).toBeVisible();
		await expect(page.getByRole('link', { name: auth.login.backToLogin })).toBeVisible();
	});

	test('trasy chronione przekierowują na /login', async ({ page }) => {
		for (const path of ['/dashboard', '/admin', '/admin/sites', '/admin/users']) {
			await page.goto(path);
			await expect(page, `trasa ${path}`).toHaveURL(/\/login$/);
		}
	});

	test('odpowiedzi HTTP mają nagłówki bezpieczeństwa', async ({ request }) => {
		const response = await request.get('/login');
		expect(response.status()).toBe(200);
		const headers = response.headers();
		expect(headers['x-frame-options']).toBe('DENY');
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['strict-transport-security']).toContain('max-age=');
	});

	test('POST bez nagłówka Origin blokuje CSRF (403)', async ({ request }) => {
		const response = await request.post('/api/admin/posts/bulk', { failOnStatusCode: false });
		expect(response.status()).toBe(403);
	});

	test('API admina bez sesji zwraca 401 JSON', async ({ request, baseURL }) => {
		const response = await request.post('/api/admin/posts/bulk', {
			headers: { origin: baseURL! },
			form: { action: '' },
			failOnStatusCode: false,
		});
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ ok: false, error: api.posts.unauthorized });
	});
});

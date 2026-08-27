import { test, expect } from '@playwright/test';
import { admin } from '@/i18n/pl/admin';
import { auth } from '@/i18n/pl/auth';
import { common } from '@/i18n/pl/common';
import { layout } from '@/i18n/pl/layout';
import { loadAdminCredentials } from './helpers/credentials';
import { signInAsAdmin } from './helpers/login';

// Pełny cykl logowania — świeży kontekst bez storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('uwierzytelnianie', () => {
	test('błędne hasło pokazuje komunikat o nieprawidłowych danych', async ({ page }) => {
		const { email } = loadAdminCredentials();
		await page.goto('/login');
		await page.getByLabel(common.email).fill(email);
		await page.getByLabel(common.password).fill('zle-haslo-e2e');
		await page.getByRole('button', { name: auth.login.submitSignIn }).click();

		await page.waitForURL(/\/login\?error=/);
		await expect(page.getByText(auth.supabase.invalidCredentials)).toBeVisible();
	});

	test('logowanie admina i wylogowanie', async ({ page }) => {
		await signInAsAdmin(page);
		await expect(page.getByRole('heading', { name: admin.queueHeading })).toBeVisible();

		await page.getByRole('button', { name: layout.navSignOut }).click();
		await page.waitForURL('**/login');

		// Po wylogowaniu trasy chronione znów są niedostępne.
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/login$/);
	});
});

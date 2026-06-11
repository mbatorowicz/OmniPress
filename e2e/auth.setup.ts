import { test as setup, expect } from '@playwright/test';
import { admin } from '@/i18n/pl/admin';
import { auth } from '@/i18n/pl/auth';
import { common } from '@/i18n/pl/common';
import { ADMIN_STORAGE_STATE } from '../playwright.config';
import { loadAdminCredentials } from './helpers/credentials';

/** Jednorazowe logowanie administratora — sesja współdzielona przez testy (storage state). */
setup('logowanie administratora (storage state)', async ({ page }) => {
	const credentials = loadAdminCredentials();

	await page.goto('/login');
	await expect(page.getByText(auth.login.headingSignIn)).toBeVisible();

	await page.getByLabel(common.email).fill(credentials.email);
	await page.getByLabel(common.password).fill(credentials.password);
	await page.getByRole('button', { name: auth.login.submitSignIn }).click();

	await page.waitForURL('**/admin');
	await expect(page.getByRole('heading', { name: admin.queueHeading })).toBeVisible();

	await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

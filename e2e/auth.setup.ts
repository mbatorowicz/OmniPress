import { test as setup, expect } from '@playwright/test';
import { admin } from '@/i18n/pl/admin';
import { ADMIN_STORAGE_STATE } from '../playwright.config';
import { signInAsAdmin } from './helpers/login';

/** Jednorazowe logowanie administratora — sesja współdzielona przez testy (storage state). */
setup('logowanie administratora (storage state)', async ({ page }) => {
	await signInAsAdmin(page);
	await expect(page.getByRole('heading', { name: admin.queueHeading })).toBeVisible();

	await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

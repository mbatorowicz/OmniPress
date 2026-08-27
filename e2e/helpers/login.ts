import { expect, type Page } from '@playwright/test';
import { auth } from '@/i18n/pl/auth';
import { common } from '@/i18n/pl/common';
import { loadAdminCredentials } from './credentials';
import { loadAdminTotpSecret } from './mfa';
import { generateTotp } from './totp';

/**
 * Logowanie administratora przez UI wraz z challenge MFA (AAL2).
 * Kończy się na `/admin`. Zwraca użyte dane konta.
 */
export async function signInAsAdmin(page: Page): Promise<{ email: string }> {
	const credentials = loadAdminCredentials();

	await page.goto('/login');
	await expect(page.getByText(auth.login.headingSignIn)).toBeVisible();

	await page.getByLabel(common.email).fill(credentials.email);
	await page.getByLabel(common.password).fill(credentials.password);
	await page.getByRole('button', { name: auth.login.submitSignIn }).click();

	await page.waitForURL(/\/(admin|auth\/mfa)$/);

	if (page.url().includes('/auth/mfa')) {
		const secret = await loadAdminTotpSecret(credentials.email);
		expect(
			secret,
			'Brak sekretu TOTP administratora — ustaw E2E_ADMIN_TOTP_SECRET albo POSTGRES_URL w .env.local.',
		).toBeTruthy();

		await page.getByLabel(auth.mfa.codeLabel).fill(generateTotp(secret as string));
		await page.getByRole('button', { name: auth.mfa.verifyLogin }).click();
		await page.waitForURL('**/admin');
	}

	return { email: credentials.email };
}

import { test, expect, type Page } from '@playwright/test';
import { adminUsers } from '@/i18n/pl/admin-users';
import { common } from '@/i18n/pl/common';

async function deleteUserAsAdmin(page: Page, baseURL: string, userId: string): Promise<void> {
	const response = await page.request.post(`/api/admin/users/${userId}/delete`, {
		// Astro checkOrigin (CSRF) wymaga nagłówka Origin przy POST.
		headers: { origin: baseURL },
		maxRedirects: 0,
	});
	expect(response.status()).toBe(302);
	expect(response.headers()['location']).toContain('deleted=1');
}

/**
 * Regresja: okno modalne otwiera skrypt bundlowany przez Astro. Gdy build wstawi go
 * inline w HTML, CSP bez `unsafe-inline` go zablokuje i przycisk przestanie działać
 * (tylko w produkcji) — patrz docs/KONWENCJE.md „Skrypty klienta i CSP”.
 */
test.describe('dodawanie użytkownika', () => {
	test('okno modalne tworzy konto redaktora i wraca na jego stronę', async ({ page, baseURL }) => {
		const cspViolations: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
				cspViolations.push(msg.text());
			}
		});

		await page.goto('/admin/users');

		const dialogHeading = page.getByRole('heading', { name: adminUsers.create.heading });
		await expect(dialogHeading).toBeHidden();
		await page.getByRole('button', { name: adminUsers.create.open }).click();
		await expect(dialogHeading).toBeVisible();

		const dialog = page.locator('#user-create-dialog');
		const email = `e2e-user-${Date.now()}@example.com`;
		// Nazwa unikalna per przebieg: konto zostawione przez przerwany test nie może
		// wywracać kolejnych uruchomień na sprawdzeniu, że po usunięciu zniknęło z listy.
		const displayName = `[E2E] Konto testowe ${Date.now()}`;
		await dialog.locator('input[name="email"]').fill(email);
		await dialog.locator('input[name="display_name"]').fill(displayName);
		await dialog.locator('input[name="password"]').fill(`E2e-${Date.now()}!`);
		await dialog.locator('select[name="role"]').selectOption('editor');
		await page.getByRole('button', { name: adminUsers.create.submit }).click();

		await page.waitForURL(/\/admin\/users\/[0-9a-f-]+\?saved=1$/);
		const userId = page.url().split('/').pop()!.split('?')[0];

		try {
			await expect(page.getByText(common.saved)).toBeVisible();
			await expect(page.getByText(adminUsers.roles.editor).first()).toBeVisible();
			expect(cspViolations, 'CSP zablokowało skrypt panelu').toEqual([]);
		} finally {
			await deleteUserAsAdmin(page, baseURL!, userId);
		}

		await page.goto('/admin/users');
		await expect(page.getByRole('link', { name: displayName })).toBeHidden();
	});
});

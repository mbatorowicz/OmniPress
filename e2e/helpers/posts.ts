import { expect, type Page } from '@playwright/test';

/** Sprzątanie po testach mutujących — trwałe usunięcie wpisu jako administrator. */
export async function deletePostAsAdmin(
	page: Page,
	baseURL: string,
	postId: string,
): Promise<void> {
	const response = await page.request.post(`/api/admin/posts/${postId}/delete`, {
		// Astro checkOrigin (CSRF) wymaga nagłówka Origin przy POST.
		headers: { origin: baseURL },
		form: { confirm: '1' },
		maxRedirects: 0,
	});
	expect(response.status()).toBe(302);
	expect(response.headers()['location']).toContain('deleted=1');
}

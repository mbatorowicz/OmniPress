import { defineConfig, devices } from '@playwright/test';
import { APP } from './src/config/app';

/**
 * Testy E2E/UI — domyślnie na produkcji (serwisy w fazie testów).
 * Override: E2E_BASE_URL=http://localhost:4321 npx playwright test
 * Konto admina: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD lub lokalny .admin-password.txt.
 * MFA: E2E_ADMIN_TOTP_SECRET (sekret TOTP w base32) — patrz e2e/helpers/totp.ts.
 */
const baseURL = process.env.E2E_BASE_URL ?? APP.productionOrigin;

export const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json';

export default defineConfig({
	testDir: './e2e',
	outputDir: './test-results',
	fullyParallel: true,
	retries: 1,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		locale: 'pl-PL',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'chromium',
			testMatch:
				/(public|admin-panel|post-lifecycle|admin-post-correction|admin-draft-approve|posts-browse|user-create|post-editor-ux)\.spec\.ts/,
			dependencies: ['setup'],
			use: {
				...devices['Desktop Chrome'],
				storageState: ADMIN_STORAGE_STATE,
			},
		},
		{
			// signOut Supabase unieważnia wszystkie sesje użytkownika — cykl
			// logowanie/wylogowanie musi biec po testach używających storage state.
			name: 'auth-flows',
			testMatch: /auth\.spec\.ts/,
			dependencies: ['chromium'],
			use: { ...devices['Desktop Chrome'] },
		},
	],
});

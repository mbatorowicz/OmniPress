import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type AdminCredentials = { email: string; password: string };

/**
 * Dane logowania administratora do testów E2E.
 * Priorytet: zmienne środowiskowe E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD,
 * fallback: lokalny .admin-password.txt (gitignore, generowany przez setup:password).
 */
export function loadAdminCredentials(): AdminCredentials {
	const email = process.env.E2E_ADMIN_EMAIL;
	const password = process.env.E2E_ADMIN_PASSWORD;
	if (email && password) return { email, password };

	const file = resolve(process.cwd(), '.admin-password.txt');
	let raw: string;
	try {
		raw = readFileSync(file, 'utf8');
	} catch {
		throw new Error(
			'Brak danych logowania E2E — ustaw E2E_ADMIN_EMAIL i E2E_ADMIN_PASSWORD ' +
				'albo wygeneruj .admin-password.txt (npm run setup:password).',
		);
	}

	const emailMatch = raw.match(/^E-mail:\s*(.+)$/m);
	const passwordMatch = raw.match(/^Hasło:\s*(.+)$/m);
	if (!emailMatch || !passwordMatch) {
		throw new Error('Nieprawidłowy format .admin-password.txt (oczekiwane „E-mail:” i „Hasło:”).');
	}

	return { email: emailMatch[1].trim(), password: passwordMatch[1].trim() };
}

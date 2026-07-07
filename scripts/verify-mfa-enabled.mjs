import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const credPath = resolve(root, '.admin-password.txt');
if (!existsSync(credPath)) {
	console.error('Brak .admin-password.txt — uruchom: npm run setup:password');
	process.exit(1);
}
const raw = readFileSync(credPath, 'utf8');
const email = raw.match(/^E-mail:\s*(.+)$/m)?.[1]?.trim();
const password = raw.match(/^Hasło:\s*(.+)$/m)?.[1]?.trim();
if (!email || !password) {
	console.error('Nieprawidłowy format .admin-password.txt');
	process.exit(1);
}

const child = spawn(
	process.execPath,
	[resolve(root, 'scripts/probe-mfa-enroll.mjs')],
	{
		stdio: 'inherit',
		env: { ...process.env, MFA_PROBE_EMAIL: email, MFA_PROBE_PASSWORD: password },
	},
);
child.on('exit', (code) => process.exit(code ?? 1));

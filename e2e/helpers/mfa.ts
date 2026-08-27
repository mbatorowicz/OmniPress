import pg from 'pg';
import { loadEnvLocal } from './env';

/**
 * Sekret TOTP administratora (base32).
 * Priorytet: E2E_ADMIN_TOTP_SECRET (CI), fallback: odczyt z `auth.mfa_factors`
 * przez POSTGRES_URL z `.env.local` — sekret nie trafia wtedy na dysk.
 * `null` = konto nie ma MFA, challenge nie wystąpi.
 */
export async function loadAdminTotpSecret(email: string): Promise<string | null> {
	if (process.env.E2E_ADMIN_TOTP_SECRET) return process.env.E2E_ADMIN_TOTP_SECRET;

	loadEnvLocal();
	const rawUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
	if (!rawUrl) return null;

	const url = new URL(rawUrl.replace(/^postgres:\/\//, 'postgresql://'));
	url.searchParams.delete('sslmode');

	const client = new pg.Client({
		connectionString: url.toString(),
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	try {
		const { rows } = await client.query<{ secret: string }>(
			`select f.secret
			 from auth.mfa_factors f
			 join auth.users u on u.id = f.user_id
			 where u.email = $1 and f.factor_type = 'totp' and f.status = 'verified'
			 order by f.created_at desc
			 limit 1`,
			[email],
		);
		return rows[0]?.secret ?? null;
	} finally {
		await client.end();
	}
}

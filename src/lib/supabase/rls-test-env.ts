/**
 * Konfiguracja polaczenia dla testow integracyjnych RLS.
 * Swiadome opt-in: bez RLS_TEST_DATABASE_URL testy sa pomijane, zeby `npm test`
 * nigdy nie laczyl sie z baza produkcyjna przypadkiem.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_VAR = 'RLS_TEST_DATABASE_URL';

function fromDotEnvLocal(): string | undefined {
	const path = resolve(process.cwd(), '.env.local');
	if (!existsSync(path)) return undefined;

	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const match = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!match || match[1]!.trim() !== ENV_VAR) continue;
		return match[2]!.trim().replace(/^["']|["']$/g, '');
	}
	return undefined;
}

export function readDatabaseUrl(): string | undefined {
	return process.env[ENV_VAR]?.trim() || fromDotEnvLocal();
}

export function pgClientConfig(url: string) {
	const parsed = new URL(url.replace(/^postgres:\/\//, 'postgresql://'));
	parsed.searchParams.delete('sslmode');
	return {
		connectionString: parsed.toString(),
		ssl: { rejectUnauthorized: false },
	};
}

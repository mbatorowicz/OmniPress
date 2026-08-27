#!/usr/bin/env node
/**
 * Spójność: setup:* (migracje SQL) w package.json ↔ tabela w docs/STATUS.md.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const status = readFileSync(resolve(root, 'docs/STATUS.md'), 'utf8');

/** setup:* bez pliku migracji — nie wymagają wiersu w tabeli SQL */
const SETUP_WITHOUT_MIGRATION = new Set([
	'setup:password',
	'setup:auth-urls',
	'setup:auth-mfa',
]);

/** setup:* z migracją poza apply-migration.mjs */
const SETUP_MIGRATION_SPECIAL = {
	'setup:remote': '20250603000000_initial_schema.sql',
};

function extractMigrationSetups() {
	const map = { ...SETUP_MIGRATION_SPECIAL };
	for (const [name, cmd] of Object.entries(pkg.scripts)) {
		if (!name.startsWith('setup:')) continue;
		const m = cmd.match(/supabase\/migrations\/([^/\s]+)/);
		if (m) map[name] = m[1];
	}
	return map;
}

function extractStatusTable() {
	const section = status.match(/## Migracje SQL[\s\S]*?(?=\n---|\n## )/);
	if (!section) throw new Error('Brak sekcji Migracje SQL w docs/STATUS.md');
	const rows = [];
	const re = /\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/g;
	let m;
	while ((m = re.exec(section[0])) !== null) {
		if (m[1] === 'Plik' || m[1].includes('-----')) continue;
		rows.push({ file: m[1], npm: m[2] });
	}
	return rows;
}

const migrationSetups = extractMigrationSetups();
const statusRows = extractStatusTable();
const statusByFile = Object.fromEntries(statusRows.map((r) => [r.file, r.npm]));
const statusByNpm = Object.fromEntries(statusRows.map((r) => [r.npm, r.file]));

const errors = [];

for (const [npm, file] of Object.entries(migrationSetups)) {
	if (statusByFile[file] !== npm) {
		errors.push(
			`package.json \`${npm}\` → ${file}, STATUS.md: ${statusByFile[file] ?? 'brak wiersu'}`,
		);
	}
}

for (const row of statusRows) {
	if (migrationSetups[row.npm] !== row.file) {
		errors.push(
			`STATUS.md \`${row.npm}\` → ${row.file}, package.json: ${migrationSetups[row.npm] ?? 'brak skryptu'}`,
		);
	}
}

const allSetups = Object.keys(pkg.scripts).filter((k) => k.startsWith('setup:'));
for (const name of allSetups) {
	if (SETUP_WITHOUT_MIGRATION.has(name)) continue;
	if (migrationSetups[name]) continue;
	errors.push(`\`${name}\` — brak mapowania migracji SQL w package.json lub STATUS.md`);
}

if (errors.length > 0) {
	console.error('lint-docs-setup: niespójności:\n');
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(`lint-docs-setup: OK (${statusRows.length} migracji)`);

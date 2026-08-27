import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let loaded = false;

/** Wczytuje `.env.local` (gitignore) do `process.env` — Playwright nie robi tego sam. */
export function loadEnvLocal(): void {
	if (loaded) return;
	loaded = true;
	let raw: string;
	try {
		raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
	} catch {
		return;
	}
	for (const line of raw.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
		if (match) process.env[match[1]] ??= match[2];
	}
}

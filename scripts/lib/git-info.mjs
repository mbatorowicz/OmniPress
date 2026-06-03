/**
 * SSOT metadanych buildu — commit z Gita (lub Vercel), semver z package.json.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Krótki SHA (7 znaków) — tożsamość wdrożenia */
export function getGitCommitShort() {
	const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
	if (vercelSha) return vercelSha.slice(0, 7);

	try {
		return execSync('git rev-parse --short=7 HEAD', {
			cwd: root,
			encoding: 'utf8',
		}).trim();
	} catch {
		return 'unknown';
	}
}

/** Semver produktu — jedyne ręczne źródło numeru wersji */
export function getPackageVersion() {
	const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
	return pkg.version;
}

/** Etykieta wyświetlana: semver+commit (np. 0.1.0+a1b2c3d) */
export function getVersionLabel() {
	return `${getPackageVersion()}+${getGitCommitShort()}`;
}

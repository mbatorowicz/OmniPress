import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	getGitHubFile,
	getGitHubFileBinary,
	putGitHubFile,
	type GitHubBinaryFileWrite,
	type GitHubConfig,
} from './github-api';

const VIEWER_REPO_PATH = 'public/omnipress/pdf-viewer.js';
const WORKER_REPO_PATH = 'public/omnipress/pdf.worker.mjs';

function ensureLocalPdfViewerBuilt(): void {
	const viewerPath = join(process.cwd(), 'public', 'omnipress', 'pdf-viewer.js');
	if (existsSync(viewerPath)) return;
	execSync('node scripts/build-pdf-viewer.mjs', { cwd: process.cwd(), stdio: 'inherit' });
}

function readPublicAsset(relativePath: string): Uint8Array {
	ensureLocalPdfViewerBuilt();
	return readFileSync(join(process.cwd(), 'public', 'omnipress', relativePath));
}

function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) return false;
	for (let i = 0; i < a.byteLength; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

async function prepareGitHubBinaryWrite(
	cfg: GitHubConfig,
	token: string,
	repoPath: string,
	localFile: string,
): Promise<GitHubBinaryFileWrite | null> {
	const local = readPublicAsset(localFile);
	const existing = await getGitHubFile(cfg, token, repoPath);
	if (existing) {
		const remote = await getGitHubFileBinary(cfg, token, repoPath);
		if (remote && buffersEqual(local, new Uint8Array(remote))) return null;
	}
	return {
		path: repoPath,
		content: local.buffer.slice(local.byteOffset, local.byteOffset + local.byteLength),
	};
}

/** Zwraca brakujące/zmienione pliki PDF viewera do dołączenia do atomowego commita. */
export async function preparePdfViewerWrites(
	cfg: GitHubConfig,
	token: string,
): Promise<GitHubBinaryFileWrite[]> {
	const writes: GitHubBinaryFileWrite[] = [];
	const viewer = await prepareGitHubBinaryWrite(cfg, token, VIEWER_REPO_PATH, 'pdf-viewer.js');
	if (viewer) writes.push(viewer);
	const worker = await prepareGitHubBinaryWrite(cfg, token, WORKER_REPO_PATH, 'pdf.worker.mjs');
	if (worker) writes.push(worker);
	return writes;
}

/** Wgrywa bundel PDF.js do repo Astro (public/omnipress), jeśli jeszcze go nie ma. */
export async function ensurePdfViewerOnGitHub(cfg: GitHubConfig, token: string): Promise<void> {
	const writes = await preparePdfViewerWrites(cfg, token);
	for (const write of writes) {
		const existing = await getGitHubFile(cfg, token, write.path);
		await putGitHubFile(
			cfg,
			token,
			write.path,
			write.content,
			write.path.endsWith('worker.mjs')
				? 'OmniPress: PDF viewer worker'
				: 'OmniPress: PDF viewer (pdf.js)',
			existing?.sha,
		);
	}
}

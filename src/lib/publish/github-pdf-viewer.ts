import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getGitHubFile, putGitHubFile, type GitHubConfig } from './github-api';
const VIEWER_REPO_PATH = 'public/omnipress/pdf-viewer.js';
const WORKER_REPO_PATH = 'public/omnipress/pdf.worker.mjs';

function ensureLocalPdfViewerBuilt(): void {
	const viewerPath = join(process.cwd(), 'public', 'omnipress', 'pdf-viewer.js');
	if (existsSync(viewerPath)) return;
	execSync('node scripts/build-pdf-viewer.mjs', { cwd: process.cwd(), stdio: 'inherit' });
}

function readPublicAsset(relativePath: string): ArrayBuffer {
	ensureLocalPdfViewerBuilt();
	const bytes = readFileSync(join(process.cwd(), 'public', 'omnipress', relativePath));
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function ensureGitHubBinary(
	cfg: GitHubConfig,
	token: string,
	repoPath: string,
	localFile: string,
	message: string,
): Promise<void> {
	const existing = await getGitHubFile(cfg, token, repoPath);
	if (existing) return;
	await putGitHubFile(cfg, token, repoPath, readPublicAsset(localFile), message);
}

/** Wgrywa bundel PDF.js do repo Astro (public/omnipress), jeśli jeszcze go nie ma. */
export async function ensurePdfViewerOnGitHub(cfg: GitHubConfig, token: string): Promise<void> {
	await ensureGitHubBinary(
		cfg,
		token,
		VIEWER_REPO_PATH,
		'pdf-viewer.js',
		'OmniPress: PDF viewer (pdf.js)',
	);
	await ensureGitHubBinary(
		cfg,
		token,
		WORKER_REPO_PATH,
		'pdf.worker.mjs',
		'OmniPress: PDF viewer worker',
	);
}

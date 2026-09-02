import { adminSitePages } from '@/i18n';
import { sha256Hex } from '@/lib/crypto/sha256-hex';
import type { PostStatus } from '@/lib/types';

export type ReconcileDecision = 'pull' | 'keep' | 'mark' | 'inspect';

export type ReconcileInput = {
	omniExists: boolean;
	omniContent: string;
	workflowStatus?: string | null;
	liveBlobSha: string;
	storedLiveBlobSha: string | null;
	publishedContentSha: string | null;
	currentContentSha: string;
	liveContentSha?: string | null;
};

const PROTECTED_STATUSES: ReadonlySet<string> = new Set<PostStatus>([
	'draft',
	'pending',
	'rejected',
	'scheduled',
]);

export function placeholderPageContent(): string {
	return adminSitePages.placeholderContent;
}

export function hashPublishedContent(content: string): string {
	return sha256Hex(content.trim());
}

export function isPlaceholderOrEmpty(content: string): boolean {
	const trimmed = content.trim();
	return trimmed === '' || trimmed === placeholderPageContent();
}

export function isProtectedWorkflowStatus(status: string | null | undefined): boolean {
	return Boolean(status && PROTECTED_STATUSES.has(status));
}

export function shouldRefusePublish(
	omniContent: string,
	remoteContent: string | null,
): boolean {
	if (remoteContent === null) return false;
	return isPlaceholderOrEmpty(omniContent) && !isPlaceholderOrEmpty(remoteContent);
}

/** GitHub wygrywa przy braku rekordu / pustce; szkic i lokalne poprawki zostają. */
export function decideReconcile(input: ReconcileInput): ReconcileDecision {
	if (!input.omniExists) return 'pull';
	if (isPlaceholderOrEmpty(input.omniContent)) return 'pull';
	if (isProtectedWorkflowStatus(input.workflowStatus)) return 'keep';
	if (input.storedLiveBlobSha && input.storedLiveBlobSha === input.liveBlobSha) {
		return 'mark';
	}

	const localEdits =
		Boolean(input.publishedContentSha) &&
		input.currentContentSha !== input.publishedContentSha;
	if (localEdits) return 'keep';
	if (input.publishedContentSha && input.currentContentSha === input.publishedContentSha) {
		return 'pull';
	}

	if (input.liveContentSha) {
		return input.liveContentSha === input.currentContentSha ? 'mark' : 'keep';
	}
	return 'inspect';
}

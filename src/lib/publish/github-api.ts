/**
 * Klient GitHub API dla publikacji. Barrel — implementacje w modułach obok:
 * `-config` (konfiguracja, adresy, błędy), `-read` (odczyt), `-commit` (commit tree),
 * `-write` (zapis), `-delete` (usuwanie), `-list` (listowanie i sondy).
 */
export {
	gitBranchRefUrls,
	httpStatusFromError,
	isGitHubRetryable,
	parseGitHubRepoConfig,
	type GitHubBinaryFileWrite,
	type GitHubConfig,
	type GitHubFileMeta,
	type GitHubFileWrite,
	type GitHubTextFileWrite,
} from './github-api-config';

export {
	getGitHubFile,
	getGitHubFileBinary,
	getGitHubFileBlobSha,
	getGitHubFileText,
} from './github-api-read';

export { putGitHubFile, putGitHubFilesBatch } from './github-api-write';

export { deleteGitHubFile, deleteGitHubFilesBatch } from './github-api-delete';

export {
	expandGitHubWithdrawPaths,
	filterGitHubMarkdownPosts,
	listGitHubDirectoryBlobs,
	listGitHubMarkdownPosts,
	listGitHubSiblingAssets,
	listGitHubTreeBlobPaths,
	probeGitHubContentPath,
	probeGitHubRepository,
	resolveGitHubWithdrawPaths,
	type GitHubDirBlob,
} from './github-api-list';

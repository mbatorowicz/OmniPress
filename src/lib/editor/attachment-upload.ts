import {
	createPendingUpload,
	patchPendingProgress,
	revokePendingPreview,
	type PendingUpload,
} from './attachment-pending';
import { uploadPostAsset, type UploadedAsset } from './upload-asset';

export type UploadLoopConfig = {
	postId: string;
	kind: Parameters<typeof uploadPostAsset>[2];
	multiple?: boolean;
	labels: { uploadFailed: string; networkError: string; uploading: string };
	toAsset: (uploaded: UploadedAsset, previewUrl: string | null) => void;
	onPendingChange: (pending: PendingUpload[]) => void;
	listRoot: HTMLElement;
};

export async function uploadSelectedFiles(
	files: File[],
	pending: PendingUpload[],
	config: UploadLoopConfig,
): Promise<PendingUpload[]> {
	const selected = config.multiple ? files : files.slice(0, 1);
	const items = selected.map(createPendingUpload);
	const next = [...pending, ...items];
	config.onPendingChange(next);

	let current = next;
	for (const item of items) {
		const file = selected[items.indexOf(item)];
		if (!file) continue;
		const result = await uploadPostAsset(config.postId, file, config.kind, config.labels, (fraction) => {
			item.progress = Math.round(fraction * 100);
			patchPendingProgress(config.listRoot, item, config.labels.uploading);
		});
		current = current.filter((p) => p.id !== item.id);
		config.onPendingChange(current);

		if (!result.ok) {
			revokePendingPreview(item);
			alert(result.error || `${config.labels.uploadFailed}: ${file.name}`);
			continue;
		}
		config.toAsset(result.asset, item.previewUrl);
	}
	return current;
}

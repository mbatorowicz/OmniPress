export const api = {
	admin: {
		forbidden: 'Brak uprawnień administratora.',
		unauthorized: 'Niezalogowany',
	},
	posts: {
		missingPostId: 'Brak ID wpisu',
		missingSiteId: 'Brak ID strony.',
		unauthorized: 'Niezalogowany',
		forbidden: 'Brak uprawnień',
		missingFile: 'Brak pliku',
		uploadFailed: 'Upload nie powiódł się.',
		assetNotFound: 'Plik nie istnieje lub nie można go usunąć.',
		deleteFailed: 'Usunięcie pliku nie powiodło się.',
	},
} as const;

export function formatUploadError(detail?: string | null): string {
	if (!detail) return api.posts.uploadFailed;
	const d = detail.toLowerCase();
	if (d.includes('bucket') && d.includes('not found')) {
		return `${api.posts.uploadFailed} Brak bucketu post-assets — uruchom npm run setup:storage-pdf.`;
	}
	if (d.includes('mime') || d.includes('content type') || d.includes('invalid')) {
		return `${api.posts.uploadFailed} Typ pliku niedozwolony w storage (dozwolone: JPEG, PNG, WebP, GIF, PDF).`;
	}
	if (d.includes('size') || d.includes('too large')) {
		return `${api.posts.uploadFailed} Plik za duży (max 15 MB w storage).`;
	}
	if (d.includes('policy') || d.includes('row-level') || d.includes('403')) {
		return `${api.posts.uploadFailed} Brak uprawnień do zapisu — wpis musi być szkicem.`;
	}
	return `${api.posts.uploadFailed} ${detail}`;
}

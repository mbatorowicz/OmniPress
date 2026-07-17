export const api = {
	admin: {
		forbidden: 'Brak uprawnień administratora.',
		unauthorized: 'Niezalogowany',
		mfaRequired: 'Wymagane uwierzytelnianie dwuskładnikowe (MFA).',
	},
	posts: {
		missingPostId: 'Brak ID wpisu',
		missingSiteId: 'Brak ID strony.',
		unauthorized: 'Niezalogowany',
		forbidden: 'Brak uprawnień',
		missingFile: 'Brak pliku',
		uploadFailed: 'Upload nie powiódł się.',
		uploadUseSigned:
			'Ten endpoint jest wyłączony — użyj bezpośredniego uploadu (upload-url / upload-complete).',
		assetNotFound: 'Plik nie istnieje lub nie można go usunąć.',
		deleteFailed: 'Usunięcie pliku nie powiodło się.',
	},
} as const;

export function formatUploadError(detail?: string | null): string {
	if (!detail) return api.posts.uploadFailed;
	const d = detail.toLowerCase();
	if (d.includes('bucket') && d.includes('not found')) {
		return `${api.posts.uploadFailed} Brak bucketu post-assets — uruchom npm run setup:storage-xlsx-zip.`;
	}
	if (d.includes('mime') || d.includes('content type') || d.includes('invalid')) {
		return `${api.posts.uploadFailed} Typ pliku niedozwolony w storage (dozwolone: JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX, ZIP, GPKG).`;
	}
	if (d.includes('size') || d.includes('too large')) {
		return `${api.posts.uploadFailed} Plik za duży (max 50 MB w storage).`;
	}
	if (d.includes('policy') || d.includes('row-level') || d.includes('403')) {
		return `${api.posts.uploadFailed} Brak uprawnień do zapisu — wpis musi być szkicem.`;
	}
	return `${api.posts.uploadFailed} ${detail}`;
}

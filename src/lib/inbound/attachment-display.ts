import { PDF_MIME } from '@/lib/posts/upload-mime';

export type AttachmentDisplay = 'embed' | 'link' | 'drop';

const POSTER_NAME = /plakat|poster|ulotka|zaproszen/i;
const COVER_LETTER =
	/prosz[ęe]\s+o\s+publikacj|prosimy\s+o\s+publikacj|prosz[ęe]\s+poinformowa[cć]|pismo\s+przewodnie/i;
const COVER_FILENAME = /(^|[^a-z0-9])pismo([^a-z0-9]|$)|przewodni/i;
const SHORT_TEXT = 400;
const POSTER_PAGES = 2;

export function isCoverLetterFilename(filename: string): boolean {
	return COVER_FILENAME.test(filename) && !POSTER_NAME.test(filename);
}

export function suggestAttachmentDisplay(input: {
	filename: string;
	mime: string;
	pageCount: number | null;
	text: string;
}): AttachmentDisplay {
	if (input.mime.startsWith('image/')) return 'embed';
	if (input.mime !== PDF_MIME) return 'link';
	const text = input.text.replace(/\s+/g, ' ').trim();
	if (COVER_LETTER.test(text) && !POSTER_NAME.test(input.filename)) return 'drop';
	const pages = input.pageCount ?? 0;
	const shortVisual = pages > 0 && pages <= POSTER_PAGES && text.length < SHORT_TEXT;
	if (POSTER_NAME.test(input.filename) || shortVisual) return 'embed';
	return 'link';
}

/** Gdy w przesyłce są materiały na stronę, pismo do urzędu nie jest osobnym wpisem. */
export function applyCoverLetterDrops<T extends { filename: string; suggestedDisplay: AttachmentDisplay; text?: string }>(
	files: T[],
): T[] {
	const hasPublic = files.some(
		(row) => row.suggestedDisplay === 'embed' || POSTER_NAME.test(row.filename),
	);
	if (!hasPublic) return files;
	return files.map((row) => {
		if (row.suggestedDisplay === 'drop') return row;
		const cover = isCoverLetterFilename(row.filename) || COVER_LETTER.test(row.text ?? '');
		return cover ? { ...row, suggestedDisplay: 'drop' } : row;
	});
}

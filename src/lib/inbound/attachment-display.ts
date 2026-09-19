import { PDF_MIME } from '@/lib/posts/upload-mime';

export type AttachmentDisplay = 'embed' | 'link' | 'drop';

const POSTER_NAME = /plakat|poster|ulotka|zaproszen/i;
const COVER_LETTER =
	/prosz[ęe]\s+o\s+publikacj|prosimy\s+o\s+publikacj|prosz[ęe]\s+poinformowa[cć]|pismo\s+przewodnie/i;
const SHORT_TEXT = 400;
const POSTER_PAGES = 2;

export function suggestAttachmentDisplay(input: {
	filename: string;
	mime: string;
	pageCount: number | null;
	text: string;
}): AttachmentDisplay {
	if (input.mime !== PDF_MIME) return 'link';
	const text = input.text.replace(/\s+/g, ' ').trim();
	if (COVER_LETTER.test(text) && !POSTER_NAME.test(input.filename)) return 'drop';
	const pages = input.pageCount ?? 0;
	const shortVisual = pages > 0 && pages <= POSTER_PAGES && text.length < SHORT_TEXT;
	if (POSTER_NAME.test(input.filename) || shortVisual) return 'embed';
	return 'link';
}

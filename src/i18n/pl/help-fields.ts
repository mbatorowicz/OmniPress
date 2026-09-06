import { dashboard } from './dashboard';
import { posts } from './posts';

const ed = dashboard.editor;

export const helpFields = {
	title: 'Pola artykułu i załączniki',
	lead: 'Co oznacza każde pole w edytorze i jak dodać zdjęcia oraz pliki.',
	pairs: [
		{
			term: ed.fields.category,
			desc: `${ed.fields.categoryHint} Lista pochodzi ze strony. Gdy jest pusta („${ed.fields.categoryEmpty}”), poproś administratora.`,
		},
		{
			term: ed.fields.title,
			desc: 'Widoczny nagłówek artykułu na stronie. Wymagany.',
		},
		{
			term: ed.fields.slug,
			desc: `Krótki adres w linku, np. „${ed.fields.slugPlaceholder.replace('np. ', '')}”. Puste pole = system utworzy adres z tytułu (polskie znaki zamieni na zwykłe).`,
		},
		{
			term: `${ed.fields.publishAt} + ${ed.fields.publishAtHour}`,
			desc: `${ed.fields.publishAtHint} ${ed.fields.publishAtTimezone} Godziny do wyboru: pełne godziny od 6:00 do 20:00.`,
		},
		{
			term: ed.fields.content,
			desc: ed.fields.contentHint,
		},
	],
	editorTitle: 'Edytor tekstu',
	editorP: `Pasek nad treścią: ${ed.richText.bold}, ${ed.richText.italic}, ${ed.richText.h2}, ${ed.richText.h3}, ${ed.richText.bulletList}, ${ed.richText.orderedList}, ${ed.richText.link}. Przy linku wpiszesz adres strony.`,
	mediaTitle: 'Zdjęcia i pliki',
	mediaPairs: [
		{
			term: ed.gallery.heading,
			desc: `${ed.gallery.hint} ${ed.gallery.add}. Miniatura i postęp widać od razu. Kolejność strzałkami, usuwanie krzyżykiem. Pierwsze zdjęcie ma znacznik „${ed.gallery.cover}”. Formaty: JPEG, PNG, WebP, GIF — max 10 MB.`,
		},
		{
			term: ed.pdfAttachments.heading,
			desc: `„${ed.pdfAttachments.add}”. Do 50 MB. Możesz wybrać „${ed.pdfAttachments.displayLink}” albo „${ed.pdfAttachments.displayEmbed}”.`,
		},
		{
			term: ed.docxAttachments.heading,
			desc: `Pliki Word — „${ed.docxAttachments.add}”, do 50 MB, jako link do pobrania.`,
		},
		{
			term: ed.fileAttachments.heading,
			desc: `GPKG, XLSX i ZIP — „${ed.fileAttachments.add}”, do 50 MB. Inne formaty system odrzuci (${posts.upload.invalidMime}).`,
		},
	],
	actionsTitle: 'Zapis, wysłanie i usuwanie',
	actionsPairs: [
		{
			term: ed.actions.save,
			desc: `Zachowuje wersję roboczą na serwerze. Wpis zostaje jako „${posts.status.draft}” albo „${posts.status.rejected}” i możesz go dalej poprawiać. Odświeżenie karty i tak przywraca niewysłane pola.`,
		},
		{
			term: ed.actions.submit,
			desc: 'Przekazuje artykuł administratorowi. Od tej pory edycja jest zablokowana.',
		},
		{
			term: ed.actions.delete,
			desc: `Trwale kasuje wpis razem z plikami. Tylko przy statusie „${posts.status.draft}” albo „${posts.status.rejected}”. Tej operacji nie można cofnąć.`,
		},
	],
	amendment: ed.fields.amendmentHint,
} as const;

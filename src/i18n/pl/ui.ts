export const ui = {
	actions: {
		edit: 'Edytuj',
		save: 'Zapisz',
		saveDraft: 'Zapisz szkic',
		cancel: 'Anuluj',
		remove: 'Usuń',
		delete: 'Usuń',
		add: 'Dodaj',
		moveUp: 'Przenieś wyżej',
		moveDown: 'Przenieś niżej',
		close: 'Zamknij',
	},
	confirm: {
		removeItem: (item: string) => `Usunąć ${item}? Tej operacji nie można cofnąć.`,
		deleteEntry: 'Usunąć ten wpis? Tej operacji nie można cofnąć.',
	},
	errors: {
		removeFailed: 'Nie udało się usunąć.',
	},
	assets: {
		photo: 'to zdjęcie z galerii',
		pdf: 'ten plik PDF',
		docx: 'ten plik DOCX',
	},
} as const;

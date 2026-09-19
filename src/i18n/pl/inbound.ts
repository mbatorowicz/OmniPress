export const inbound = {
	heading: 'Szkic z poczty',
	titleLabel: 'Tytuł',
	hint: 'To szkic — otwórz w panelu, sprawdź tytuł i kategorię, potem wyślij do akceptacji.',
	unprocessedHint:
		'Grok nie przerobił tego maila (surowy temat i treść, bez kategorii). Otwórz w panelu: Wpisy → filtr Szkic.',
	unnamedFile: 'załącznik',
	skippedList: 'Nie udało się pobrać listy załączników.',
	skippedTooLarge: (name: string) => `Pominięto załącznik „${name}”: za duży plik.`,
	skippedType: (name: string) => `Pominięto załącznik „${name}”: niedozwolony typ.`,
	skippedContent: (name: string) =>
		`Pominięto załącznik „${name}”: treść nie zgadza się z typem.`,
	skippedFetch: (name: string) => `Pominięto załącznik „${name}”: nie udało się pobrać.`,
	skippedLimit: (name: string) =>
		`Pominięto załącznik „${name}”: przekroczono limit liczby plików.`,
	skippedLimitMany: (count: number) =>
		`Pominięto ${count} załączników: przekroczono limit liczby plików.`,
	skippedStore: (name: string) => `Pominięto załącznik „${name}”: zapis nie powiódł się.`,
} as const;

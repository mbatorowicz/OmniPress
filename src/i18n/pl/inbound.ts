export const inbound = {
	heading: 'Szkic z poczty',
	titleLabel: 'Tytuł',
	hint: 'To szkic — otwórz w panelu, sprawdź tytuł i kategorię, potem wyślij do akceptacji.',
	replaceHeading: 'Podmiana z poczty',
	replaceHint: 'Podmiana w panelu. Na stronie zostaje stara wersja, aż opublikujesz.',
	clarifyHeading: 'Pytanie ze skrzynki',
	clarifyHint: 'Grok nie ogarnął przesyłki. Odpowiedz na maila albo użyj ponownego odczytu w panelu.',
	failedHint:
		'Grok nie przerobił tego maila. Ponowny odczyt: panel → replay. Nic nie poszło na stronę.',
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
	failedQuestion:
		'Nie udało się odczytać materiałów. Odpowiedz w tym wątku albo użyj ponownego odczytu w panelu.',
	mail: {
		fromName: 'Skrzynka OmniPress',
		clarifyIntro: 'Nie mogę sam dokończyć tej przesyłki.',
		clarifyAsk: 'Odpowiedz w tym wątku — wezmę Twoją dopowiedź i te same załączniki od nowa.',
		fallbackSubject: 'materiał na stronę',
		candidatesHeading: 'Pasuje więcej niż jeden cel:',
		candidateLine: (title: string, url: string) => `- ${title}: ${url}`,
	},
	replay: {
		missingEmail: 'Brak identyfikatora maila.',
		fetchFailed: 'Nie udało się pobrać maila z Resend.',
	},
} as const;

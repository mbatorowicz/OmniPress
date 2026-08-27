/** Listy wyboru edytora layoutu — etykiety komponentów i opcje pól select. */
export const adminLayoutOptions = {
	componentLabels: {
		'site.meta': 'Meta strony — nazwa i SEO',
		'topbar.tagline': 'Pasek górny — tagline',
		'header.brand': 'Nagłówek — logo',
		'header.navigation': 'Nagłówek — menu główne',
		'home.pinned': 'Strona główna — przypięte',
		'home.latest': 'Strona główna — najnowsze',
		'sidebar.weather': 'Sidebar — ostrzeżenia meteorologiczne (IMGW)',
		'sidebar.recent_changes': 'Sidebar — ostatnie zmiany',
		'sidebar.cert_advisories': 'Sidebar — komunikaty CERT',
		'sidebar.banner': 'Sidebar — baner',
		'footer.main': 'Stopka — dane kontaktowe',
	},
	sectionTitles: {
		home_feed: 'Feedy strony głównej',
		recent_changes: 'Ostatnie zmiany (sidebar)',
		live_feed: 'Widgety na żywo (CERT / IMGW)',
		banner: 'Banery (sidebar)',
	},
	navDepthLabels: ['Poziom 0', 'Poziom 1', 'Poziom 2'] as const,
	navMenuColumnOptions: {
		one: '1 kolumna',
		two: '2 kolumny',
	},
	navHrefKinds: {
		none: 'Bez linku (tylko rozwijane)',
		category: 'Kategoria wpisów',
		page: 'Strona z menu / CMS',
		static: 'Stała trasa (/, /kontakt)',
		custom: 'Własny URL wewnętrzny',
		external: 'Adres zewnętrzny',
	},
	bannerLinkTypes: {
		category: 'Kategoria wpisów',
		page: 'Strona statyczna',
		external: 'Adres zewnętrzny',
	},
	bannerStyles: {
		image: 'Obrazek',
		text: 'Tekstowy',
	},
	bannerImageVariants: {
		default: 'Standardowy',
		blue: 'Niebieskie tło',
	},
	weatherDetailsDisplayOptions: {
		modal: 'Modal — szerokie okno (zalecane)',
		inline: 'Rozwijane w sidebarze',
	},
	weatherDetailsLayoutOptions: {
		stacked: 'Jedna kolumna (zalecane)',
		grid: 'Dwie kolumny (etykieta | wartość)',
	},
	certCategories: {
		all: 'Wszystkie kategorie',
	},
	categoryArchiveLayoutOptions: {
		tiles: 'Kafelki',
		titleList: 'Lista tytułów',
	},
	categoryArchiveColumnsOptions: {
		one: '1 kolumna',
		two: '2 kolumny',
		three: '3 kolumny',
	},
	variants: {
		default: 'Domyślny',
		alert: 'Ostrzeżenie (żółty)',
	},
} as const;

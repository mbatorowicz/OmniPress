/** Mapowanie kategorii WP → slugi OmniPress / repo Astro. */

export const WP = 'https://gmina-miedzna.pl';

/** Kolejność = priorytet kategorii głównej (bardziej specyficzna wyżej). */
export const TAKE_CATEGORIES = [
	{ id: 87, slug: 'usc', name: 'USC' },
	{ id: 141, slug: 'nieczystosci-ciekle', name: 'Nieczystości ciekłe' },
	{ id: 86, slug: 'dzialalnosc-gospodarcza', name: 'Działalność gospodarcza' },
	{
		id: 105,
		slug: 'dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
		name: 'Dofinansowano ze środków Rządowego Funduszu Rozwoju Dróg',
	},
	{ id: 92, slug: 'panstwowy-fundusz-celowy', name: 'Państwowy Fundusz Celowy' },
	{ id: 142, slug: 'plan-ogolny-gminy-miedzna', name: 'Plan Ogólny Gminy Miedzna' },
	{ id: 162, slug: 'ochrona-ludnosci', name: 'Ochrona ludności' },
	{ id: 161, slug: 'mazowsze-bez-smogu', name: 'Mazowsze bez smogu' },
	{ id: 10, slug: 'inwestycje', name: 'Inwestycje' },
];

export const TAKE_BY_ID = new Map(TAKE_CATEGORIES.map((c) => [c.id, c]));

export const NEW_LAYOUT_CATEGORIES = TAKE_CATEGORIES.filter(
	(c) =>
		![
			'plan-ogolny-gminy-miedzna',
			'ochrona-ludnosci',
			'mazowsze-bez-smogu',
		].includes(c.slug),
).map(({ slug, name }) => ({ slug, name }));

/** Nie nadpisuj archiwum kategorii redirectem ze slugu wpisu (np. mazowsze-bez-smogu). */
export const RESERVED_REDIRECT_SOURCES = new Set([
	...TAKE_CATEGORIES.map((c) => `/${c.slug}`),
	'/aktualnosci',
	'/odpady',
	'/gospodarka-odpadami',
	'/zarzadzenia',
	'/kontakt',
]);

export const CATEGORY_ARCHIVE_REDIRECTS = {
	'/gmina/inwestycje': '/inwestycje',
	'/category/inwestycje': '/inwestycje',
	'/category/dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog':
		'/dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
	'/category/panstwowy-fundusz-celowy': '/panstwowy-fundusz-celowy',
	'/category/nieczystosci-ciekle': '/nieczystosci-ciekle',
	'/category/dzialalnosc-gospodarcza': '/dzialalnosc-gospodarcza',
	'/category/usc': '/usc',
	'/category/mazowsze-bez-smogu': '/mazowsze-bez-smogu',
	'/category/plan-ogolny-gminy-miedzna': '/plan-ogolny-gminy-miedzna',
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug) {
	return slug.length >= 2 && SLUG_PATTERN.test(slug);
}

export function takeIdsQuery() {
	return TAKE_CATEGORIES.map((c) => c.id).join(',');
}

export function classifyPost(wpCategoryIds) {
	const taken = TAKE_CATEGORIES.filter((c) => wpCategoryIds.includes(c.id));
	if (taken.length === 0) return null;
	const primary = taken[0];
	const extras = taken.slice(1).map((c) => c.slug);
	return {
		primarySlug: primary.slug,
		primaryName: primary.name,
		allSlugs: [primary.slug, ...extras],
	};
}

export const SIDEBAR_BANNERS = [
	{
		id: 'slot_wp_banner_mazowsze',
		label: 'Mazowsze bez smogu',
		imageUrl: '/img/bez-smogu.png',
		source: `${WP}/img/bez-smogu.png`,
		categorySlug: 'mazowsze-bez-smogu',
		order: 24,
	},
	{
		id: 'slot_wp_banner_rfrd',
		label: 'Rządowy Fundusz Rozwoju Dróg',
		imageUrl: '/img/plakat-rfrd.jpg',
		source: `${WP}/img/plakat_Dofinansowano_ze_srodkow_Rzadowego_Funduszu_Rozwoju_Drog.jpg`,
		categorySlug: 'dofinansowano-ze-srodkow-rzadowego-funduszu-rozwoju-drog',
		order: 25,
	},
	{
		id: 'slot_wp_banner_fundusz',
		label: 'Państwowy Fundusz Celowy',
		imageUrl: '/img/plakat-fundusz-celowy.jpg',
		source: `${WP}/img/plakat_fundusz_celowy.jpg`,
		categorySlug: 'panstwowy-fundusz-celowy',
		order: 26,
	},
];

export const PDF_LABELS = {
	prev: 'Poprzednia',
	next: 'Następna',
	page: 'Strona',
	of: 'z',
	zoomIn: 'Powiększ',
	zoomOut: 'Pomniejsz',
	download: 'Pobierz PDF',
	loading: 'Ładowanie PDF…',
	error: 'Nie udało się wyświetlić PDF.',
	open: 'Otwórz PDF w nowej karcie',
};

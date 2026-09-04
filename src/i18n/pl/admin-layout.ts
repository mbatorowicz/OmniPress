/**
 * Teksty edytora wyglądu strony. Rozbite na cztery pliki, bo `adminLayout` jest
 * największym słownikiem panelu: opisy zakładek (tu), listy wyboru, etykiety pól
 * i komunikaty stanu synchronizacji.
 */
import { adminLayoutFields } from './admin-layout-fields';
import { adminLayoutOptions } from './admin-layout-options';
import { adminLayoutStatus } from './admin-layout-status';

const layoutText = {
	title: 'Wygląd strony',
	layoutTitle: 'Wygląd strony',
	layoutLead:
		'Formularz odzwierciedla stronę Astro po publikacji. Szkic w OmniPress ≠ strona live — zmiany trafiają na GitHub dopiero po „Opublikuj cały layout”.',
	categoriesTitle: 'Kategorie',
	componentsTitle: 'Komponenty',
	componentsLead:
		'Spis komponentów wg typu — specjalne widgety, feedy kategorii, linki i banery. Przy dodawaniu wybierz szablon i strefę wyświetlania (strona główna, sidebar lub stopka).',
	registryGroupSpecial: 'Komponenty specjalne',
	registryGroupSpecialDesc: 'Widgety na żywo i lokalne — ostrzeżenia IMGW, CERT oraz ostatnie zmiany na stronie.',
	registryGroupCategories: 'Komponenty kategorii',
	registryGroupCategoriesDesc: 'Sekcje wpisów przypisane do kategorii — przypięte lub najnowsze.',
	registryGroupLinks: 'Komponenty linków',
	registryGroupLinksDesc: 'Elementy kierujące do zewnętrznego adresu URL lub strony statycznej.',
	registryGroupBanners: 'Komponenty banerów',
	registryGroupBannersDesc: 'Banery graficzne lub tekstowe — często z linkiem do kategorii wpisów.',
	registryGroupEmpty: 'Brak komponentów w tej grupie.',
	addComponent: 'Dodaj komponent',
	addTemplateCategory: 'Kategoria',
	addTemplateExternalLink: 'Link własny',
	addTemplateStaticPage: 'Strona statyczna',
	addTemplateBanner: 'Baner',
	addSpecialWeather: '+ Ostrzeżenia IMGW',
	addSpecialCert: '+ Komunikaty CERT',
	addSpecialRecentChanges: '+ Ostatnie zmiany',
	addDialogTitle: 'Dodaj komponent',
	addDialogZoneLabel: 'Strefa wyświetlania',
	addDialogConfirm: 'Dodaj',
	addDialogCancel: 'Anuluj',
	slotZoneBadge: 'Strefa',
	categoriesFeedAssignHint:
		'Przypisanie kategorii do sekcji strony głównej ustawiasz w zakładce Komponenty → Konfiguracja slotów (przy feedzie strony głównej).',
	lead: 'Menu, kategorie i komponenty — szkic w OmniPress, publikacja na żądanie do repozytorium GitHub.',
	publishedLayout: 'Layout wysłany na stronę — panel pokazuje dokładnie opublikowaną konfigurację.',
	publishSkipped: 'Bez zmian względem strony — pominięto commit na GitHub.',
	syncSummaryPrefix: 'GitHub:',
	imported: 'Konfiguracja wczytana z GitHub do szkicu.',
	importedLayout: (hrefCount: number) =>
		`Layout wczytany ze strony (menu + kategorie) · ${hrefCount} ${hrefCount === 1 ? 'link' : hrefCount < 5 ? 'linki' : 'linków'}`,
	noAstroChannel:
		'Brak skonfigurowanego repozytorium GitHub — zapis szkicu tylko w OmniPress (bez publikacji na stronę).',
	slotsManageHint:
		'Dodawaj i usuwaj sloty, ustawiaj identyfikator techniczny i kolejność w sidebarze. Treść slotu edytujesz w sekcji powyżej.',
	recentChangesHint:
		'Widget w sidebarze pokazuje ogłoszenia dodane w OmniPress (ta zakładka) oraz wpisy z publikacji.',
	slotsOrderHint:
		'Kolejność (order) dotyczy wszystkich komponentów sidebar.* — banery, ostrzeżenia meteo, CERT i ostatnie zmiany sortują się wspólnie. Możesz też zmieniać kolejność strzałkami w podglądzie szablonu.',
	slotsPreviewTitle: 'Podgląd szablonu',
	slotsPreviewHint:
		'Schemat układu strony — strefa główna i sidebar. Kliknij kartę, aby przejść do konfiguracji slotu poniżej.',
	slotsPreviewMenuPlaceholder: 'Nagłówek / menu nawigacji',
	slotsPreviewHomeZone: 'Strefa główna',
	slotsPreviewSidebarZone: 'Sidebar',
	slotsPreviewDisabled: 'wyłączony',
	slotsPreviewEmpty: 'Brak komponentów w tej strefie',
	zonesEditorHint:
		'Strona podzielona na sekcje jak na żywej stronie. W każdej sekcji dodajesz elementy — feedy, widgety, banery. Kliknij „Ustawienia”, aby edytować szczegóły w oknie.',
	slotsAdvancedTitle: 'Zaawansowane — identyfikatory i kolejność',
	layoutSubNavLabel: 'Sekcje wyglądu strony',
	layoutTabHeader: 'Nagłówek',
	layoutTabHome: 'Strefa główna',
	layoutTabSidebar: 'Sidebar',
	layoutTabFooter: 'Stopka',
	layoutTabSite: 'Meta strony',
	layoutTabHeaderLead:
		'Pasek górny z narzędziami ułatwień dostępu (WCAG), logo, menu główne i nawigacja.',
	layoutTabHomeLead: 'Feedy strony głównej — przypięte wpisy i najnowsze aktualności.',
	layoutTabSidebarLead: 'Widgety boczne — ostrzeżenia, banery i automatyczne ostatnie zmiany.',
	layoutTabFooterLead: 'Dane kontaktowe i linki w stopce strony.',
	layoutTabSiteLead: 'Tytuł, opis SEO i adres URL witryny.',
	layoutMenuNavSlotTitle: 'Włączenie menu',
	layoutMenuNavSlotHint: 'Włącz lub wyłącz renderowanie menu głównego na stronie.',
	zoneAddElement: '+ Dodaj element',
	slotDialogOpen: 'Ustawienia',
	slotDialogClose: 'Zamknij',
	slotDialogTitle: 'Ustawienia elementu',
	slotCardEnabledShort: 'Wł.',
	navInMenuHint: 'Pozycje menu — linki do stron statycznych, kategorii wpisów lub adresów zewnętrznych.',
	slotsZoneDescTopbar:
		'Tagline portalu i narzędzia ułatwień dostępu (kontrast, rozmiar czcionki). Checkbox „Wł.” wyłącza cały pasek.',
	topbarAccessibilityToolsHint:
		'Po wyłączeniu na stronie publicznej znikają przyciski kontrastu i zmiany czcionki (A+/A−). Tagline pozostaje widoczny.',
	slotsZoneDescHeader: 'Logo i identyfikacja wizualna nagłówka.',
	slotsZoneDescHome: 'Sekcje strony głównej — przypisz kategorie wpisów do każdego feedu.',
	slotsZoneDescSidebar: 'Widgety boczne — ostrzeżenia, banery, ostatnie zmiany. Źródło treści zależy od typu elementu.',
	slotsZoneDescFooter: 'Dane kontaktowe i linki w stopce.',
	slotsZoneDescSite: 'Meta strony — tytuł, opis SEO i adres URL.',
	slotsZoneEmptyHome: 'Brak slotów w strefie głównej — dodaj slot w sekcji „Zarządzanie slotami”.',
	slotsZoneEmptySidebar: 'Brak slotów w sidebarze — dodaj slot w sekcji „Zarządzanie slotami”.',
	slotsZoneSite: 'Meta strony',
	slotsZoneTopbar: 'Pasek górny',
	slotsZoneHeader: 'Nagłówek',
	slotsZoneFooter: 'Stopka',
	slotsZoneEmptySite: 'Brak slotu meta.',
	slotsZoneEmptyTopbar: 'Brak slotu paska górnego.',
	slotsZoneEmptyHeader: 'Brak slotów nagłówka.',
	slotsZoneEmptyFooter: 'Brak slotu stopki.',
	localFeedEntriesHint:
		'Wpisy są zapisywane w pliku layoutu przy publikacji. Nowe ogłoszenie dodasz w sekcji poniżej.',
	slotPanelSectionTitleLabel: 'Nazwa robocza slotu',
	homeFeedCategoriesLabel: 'Kategorie wpisów w tym slocie',
	homeFeedCategoriesHint:
		'Zaznacz kategorie, z których wpisy mają trafiać do tej sekcji strony głównej.',
	homeFeedPinnedHint:
		'W sekcji przypiętych wyświetlają się tylko wpisy z flagą przypięcia — sam checkbox kategorii nie wystarczy.',
	homeFeedTileHeightHint:
		'Puste pole = automatyczna wysokość (proporcja miniatury 16:10). Wpisz wartość 200–600, aby ustawić stałą wysokość całego kafelka.',
	previewChipNoCategories: 'Brak przypisanych kategorii',
	previewChipCategoriesPrefix: 'Kategorie:',
	previewChipPinnedOnly: 'tylko przypięte',
	previewChipLinkPrefix: 'Link:',
	slotsPreviewMoveUp: 'Przesuń wyżej',
	slotsPreviewMoveDown: 'Przesuń niżej',
	menuFormHint:
		'Każda pozycja to jedna linia — cały kafelek jest wcięty wg hierarchii (poziom 0–2). Kolory poziomów: „Palety kolorów”.',
	navDepthColorsHint:
		'Jeden kolor na poziom — tło i obramowanie. Tekst dobierany automatycznie. Zapisz szkic, aby zachować kolory.',
	menuJsonFallbackHint:
		'Wklej pełną tablicę JSON zamiast wierszy powyżej — nadpisuje drzewo przy zapisie.',
	navMenuColumnsHint:
		'Szerokość widoczna każdej kolumny w panelu menu (px, rem, fr). Przy 2 kolumnach panel = suma kolumn + odstęp + margines panelu.',
	navMenuColumnWidthPlaceholder: 'np. 320px',
	navMenuColumnWidth2Placeholder: 'np. 1fr',
	categoriesSlugWarning: 'Zmiana slug nie aktualizuje URL-i już opublikowanych wpisów — wymagają republikacji.',
	navValidationHeading: 'Problemy w menu (linki wewnętrzne):',
	navValidationHint:
		'Publikacja jest zablokowana, dopóki menu wskazuje nieistniejące adresy. Utwórz strony statyczne lub popraw linki.',
	publishBlockedMissingHref:
		'Publikacja zablokowana — szkic nie ma linków, które są na stronie live. Odśwież zakładkę Menu — panel sam wczyta je z GitHub, gdy nie masz niewysłanych zmian.',
	noPublishedPages: 'Brak opublikowanych stron statycznych.',
	noCategoriesForNav: 'Brak kategorii — dodaj w zakładce Kategorie.',
	navParentRoot: '—',
	navParentMissing: 'Brak pozycji nadrzędnej powyżej',
	certAdvisoriesHint:
		'Komunikaty CERT Polska (RSS) — widget na stronie woła /api/cert/advisories, cache ~15 min, bez commita do GitHub.',
	weatherHint:
		'Ostrzeżenia IMGW (meteo.imgw.pl) dla powiatu przypisanego do strony. Widget woła /api/weather/warnings — dane na żywo, cache ~15 min.',
	weatherMapHint:
		'Lat/lon i zoom są opcjonalne — mapa na stronie dopasowuje widok do zasięgu ostrzeżenia. Dodatkowe powiaty służą tylko jako kontekst (szare obramowanie).',
	weatherDetailsHint:
		'Modal otwiera szczegóły w szerokim oknie nad stroną — zalecane dla czytelności długich treści ostrzeżeń.',
	categoriesHint: 'Slug musi odpowiadać segmentowi URL wpisu (/{category}/{slug}).',
	categoryArchiveHint:
		'Dotyczy listy wpisów na stronie /{slug}/ — kafelki (z miniaturą i zajawką) lub lista tytułów z datą.',
} as const;

export const adminLayout = {
	...layoutText,
	...adminLayoutOptions,
	...adminLayoutFields,
	...adminLayoutStatus,
} as const;

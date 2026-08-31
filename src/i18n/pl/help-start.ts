import { APP } from '@/config/app';
import { auth } from './auth';
import { common } from './common';
import { dashboard } from './dashboard';
import { layout } from './layout';

export const helpStart = {
	whatTitle: 'Czym jest OmniPress',
	whatP1: `${common.appName} to panel do przygotowania artykułów na stronę internetową. Piszesz tekst, dodajesz zdjęcia i pliki. Administrator sprawdza wpis i dopiero potem pojawia się on na stronie.`,
	whatP2: 'Nie potrzebujesz dostępu do innych systemów ani znajomości technicznej. Widzisz tylko własne artykuły na stronach, do których administrator dał Ci dostęp.',
	loginTitle: 'Logowanie i hasło',
	loginP1: `Wejdź na ${APP.productionOrigin}/login. Konto zakłada administrator — dostaniesz adres e-mail i hasło startowe (albo sam ustawisz hasło przy pierwszym logowaniu).`,
	loginSteps: [
		`Wpisz ${common.email.toLowerCase()} i ${common.password.toLowerCase()}.`,
		`Kliknij „${auth.login.submitSignIn}”.`,
		`Otworzy się ${dashboard.title}.`,
	],
	loginForgot: `Jeśli nie znasz hasła albo logujesz się pierwszy raz, kliknij „${auth.login.forgotPassword}”. Podaj e-mail — w skrzynce (także w spamie) znajdziesz link. Hasło musi mieć co najmniej 8 znaków.`,
	loginOut: `Wylogowanie: przycisk „${layout.navSignOut}” w prawym górnym rogu.`,
	panelTitle: dashboard.title,
	panelP1: 'Po zalogowaniu widzisz ścieżkę pracy, przycisk nowego artykułu i listę swoich wpisów.',
	panelItems: [
		`Ścieżka: ${dashboard.workflow.draft} → ${dashboard.workflow.submit} → ${dashboard.workflow.wait} → ${dashboard.workflow.live}.`,
		`${dashboard.sites.heading} — jednostki, na które możesz pisać.`,
		`„${dashboard.articles.newPost}” — rozpoczyna nowy szkic.`,
		`${dashboard.posts.heading} — kliknij tytuł, aby otworzyć wpis.`,
	],
} as const;

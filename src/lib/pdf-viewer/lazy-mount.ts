/**
 * Odkłada montaż widgetu PDF do chwili, gdy zbliża się do widoku.
 *
 * Wpis może mieć kilka osadzonych dokumentów (na produkcji jest wpis z pięcioma
 * o łącznej wadze ~70 MB). Montaż wszystkich przy wejściu na stronę pobierał je
 * równolegle, choć czytelnik widzi pierwszy.
 */

const ROOT_MARGIN = '300px';

type MountFn = (el: HTMLElement) => void;

function hasObserver(): boolean {
	return typeof IntersectionObserver !== 'undefined';
}

/**
 * Montuje `el` gdy wejdzie w pole widzenia; bez `IntersectionObserver`
 * (starsza przeglądarka) montuje od razu, żeby widget nie został pusty.
 */
export function mountWhenVisible(el: HTMLElement, mount: MountFn): void {
	if (!hasObserver()) {
		mount(el);
		return;
	}

	let mounted = false;
	const observer = new IntersectionObserver(
		(entries) => {
			if (mounted || !entries.some((entry) => entry.isIntersecting)) return;
			mounted = true;
			observer.disconnect();
			mount(el);
		},
		{ rootMargin: ROOT_MARGIN },
	);
	observer.observe(el);
}

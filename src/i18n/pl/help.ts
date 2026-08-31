import { helpStart } from './help-start';
import { helpCreate } from './help-create';
import { helpFields } from './help-fields';
import { helpStatus } from './help-status';
import { helpFaq } from './help-faq';

export const help = {
	title: 'Instrukcja redaktora',
	lead: 'Jak zalogować się, napisać artykuł i wysłać go do publikacji na stronie.',
	nav: 'Pomoc',
	tocHeading: 'W tej instrukcji',
	tocAria: 'Spis treści instrukcji',
	back: 'Wróć do listy wpisów',
	start: helpStart,
	create: helpCreate,
	fields: helpFields,
	status: helpStatus,
	faq: helpFaq,
} as const;

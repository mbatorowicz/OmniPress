/** Zamiana surowej odpowiedzi GitHub (np. „GitHub GET 401: Bad credentials”) na komunikat dla redaktora. */
import { adminDestinations } from '@/i18n/pl/admin-panels';
import { httpStatusFromError } from './github-api-config';

const pe = adminDestinations.publishErrors;

/** Zwraca tekst dla redaktora; surowy komunikat zostaje w nawiasie jako ślad diagnostyczny. */
export function explainGitHubError(message: string): string {
	const status = httpStatusFromError(message);
	if (status === 401) return `${pe.badCredentials} (${message.slice(0, 160)})`;
	if (status === 403) return `${pe.forbidden} (${message.slice(0, 160)})`;
	return message;
}

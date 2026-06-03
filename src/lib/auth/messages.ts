/** Czytelne komunikaty z błędów Supabase Auth */
export function mapAuthError(message: string): string {
	const m = message.toLowerCase();

	if (m.includes('invalid login') || m.includes('invalid credentials')) {
		return 'Nieprawidłowy e-mail lub hasło.';
	}
	if (m.includes('email not confirmed')) {
		return 'Potwierdź adres e-mail przed logowaniem (Supabase → Auth → Users).';
	}
	if (m.includes('redirect') || m.includes('allow list') || m.includes('uri')) {
		return 'Błąd konfiguracji Supabase (Redirect URLs). Administrator musi ustawić Site URL na https://omni-press.vercel.app';
	}
	if (m.includes('rate limit') || m.includes('too many')) {
		return 'Zbyt wiele prób — odczekaj chwilę i spróbuj ponownie.';
	}
	if (m.includes('user not found')) {
		return 'Jeśli konto istnieje, wysłaliśmy link (sprawdź też spam).';
	}

	return `Błąd: ${message}`;
}

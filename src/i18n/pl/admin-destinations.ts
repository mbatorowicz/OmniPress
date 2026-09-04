/** Teksty kanału publikacji (GitHub + opcjonalna weryfikacja Vercel). */
export const adminDestinations = {
	fields: {
		repo: 'Repozytorium (owner/repo)',
		repoHint: 'Bez .git na końcu — np. mbatorowicz/gmina-miedzna.pl',
		branch: 'Branch',
		contentPath: 'Folder z plikami .md — dla gminy-miedzna.pl: src/content/news',
		contentLayout: 'Układ publikacji',
		contentLayoutFlat: 'Płaski (slug.md)',
		contentLayoutFolder: 'Folder (slug/index.md) — gmina-miedzna.pl',
		githubToken: 'Token GitHub (PAT)',
		vercelSection: 'Weryfikacja deployu Vercel (opcjonalnie)',
		vercelHint:
			'Po pushu na GitHub OmniPress czeka na build Vercel i zapisuje błąd z logu (np. składnia). Token: vercel.com/account/tokens lub zmienna VERCEL_TOKEN na serwerze OmniPress.',
		vercelProjectId: 'ID projektu Vercel',
		vercelTeamId: 'ID zespołu Vercel (opcjonalnie)',
		vercelToken: 'Token Vercel (opcjonalnie)',
		credentialsHint: 'Pozostaw puste, aby zachować obecne credentials.',
		layoutPath: 'Plik layoutu w repozytorium (omnipress-layout.json)',
		categoriesPath: 'Plik kategorii w repozytorium',
		navigationPath: 'Plik menu w repozytorium',
		recentChangesPath: 'Plik ostatnich zmian w repozytorium',
	},
	actions: { testChannel: 'Testuj połączenie' },
	publishErrors: {
		badCredentials:
			'Token GitHub jest nieważny lub wygasł (HTTP 401) — publikacja wstrzymana. Wejdź w ustawienia jednostki → „Publikacja na GitHub", wklej nowy fine-grained PAT (Contents: Read and write, Metadata: Read) i zapisz, a potem wyślij wpis ponownie.',
		forbidden:
			'GitHub odmówił dostępu (HTTP 403) — token nie ma uprawnień do repozytorium albo przekroczono limit zapytań. Sprawdź uprawnienia tokenu w ustawieniach jednostki → „Publikacja na GitHub".',
	},
	channelTest: {
		tokenExpiresAt: (date: string) => `Token wygasa: ${date}.`,
		tokenNoExpiry: 'Token bez daty wygaśnięcia.',
		invalidRepo: 'Podaj repozytorium w formacie owner/nazwa.',
		noGitHubToken:
			'Brak tokena GitHub — wpisz PAT lub zapisz destynację z zapisanym tokenem.',
		githubRepoError: (status: number, detail: string) => `GitHub repo: HTTP ${status}. ${detail}`,
		githubOk: (owner: string, repo: string, branch: string, path: string) =>
			`GitHub OK — ${owner}/${repo} (${branch}), folder „${path}".`,
		vercelNotConfigured: 'Vercel: nie skonfigurowano (opcjonalnie: ID projektu w polu poniżej).',
		vercelNotConfiguredShort: 'Vercel: nie skonfigurowano.',
		vercelProjectError: (detail: string) => `Vercel: błąd projektu — ${detail}`,
		vercelNoDeploys: (name: string) => `Vercel: projekt „${name}" OK (brak deployów).`,
		vercelOk: (name: string, state: string, sha: string) =>
			`Vercel: projekt „${name}" OK — ostatni deploy ${state} (commit ${sha}).`,
		vercelDeployListError: (msg: string) => `Vercel: projekt OK, ale lista deployów: ${msg}`,
		vercelNoToken: 'Vercel: brak tokena (VERCEL_TOKEN na serwerze lub pole w formularzu).',
		connectFailed: (msg: string) => `Nie udało się połączyć z GitHub: ${msg}`,
		unknownError: 'nieznany błąd',
		unknownNetworkError: 'nieznany błąd sieci',
		client: {
			testing: 'Testowanie…',
			ok: 'OK',
			testFailed: 'Błąd testu',
			networkError: 'Błąd sieci — spróbuj ponownie.',
		},
	},
} as const;

/** Kontrakt etykiet edytora nawigacji — teksty wstrzykuje strona z `@/i18n`. */
export type NavigationTableLabels = {
	remove: string;
	edit: string;
	closeEdit: string;
	depth0: string;
	depth1: string;
	depth2: string;
	menuColumnOne: string;
	menuColumnTwo: string;
	menuColumnsHint: string;
	addNavChild: string;
	navParentRoot: string;
	navParentMissing: string;
	navParentPrefix: string;
	hrefKinds: {
		none: string;
		category: string;
		page: string;
		static: string;
		custom: string;
		external: string;
	};
	fieldLabels: {
		navDepth: string;
		navParent: string;
		navLabel: string;
		navLinkType: string;
		navLinkTarget: string;
		navMenuColumns: string;
		navMenuColumnCount: string;
		navMenuColumnWidth1: string;
		navMenuColumnWidth2: string;
	};
};

import { help } from '@/i18n';

export type HelpPair = { readonly term: string; readonly desc: string };

export type HelpBlock =
	| { type: 'p'; text: string }
	| { type: 'steps'; items: readonly string[] }
	| { type: 'list'; items: readonly string[] }
	| { type: 'pairs'; items: readonly HelpPair[] };

export type HelpSection = {
	id: string;
	title: string;
	blocks: readonly HelpBlock[];
};

function pairs(items: readonly HelpPair[]): HelpBlock {
	return { type: 'pairs', items };
}

/** Sekcje instrukcji redaktora — kolejność = spis treści w panelu. */
export function buildEditorHelpGuide(): readonly HelpSection[] {
	const s = help.start;
	const c = help.create;
	const f = help.fields;
	const st = help.status;
	return [
		{
			id: 'start',
			title: s.whatTitle,
			blocks: [{ type: 'p', text: s.whatP1 }, { type: 'p', text: s.whatP2 }],
		},
		{
			id: 'login',
			title: s.loginTitle,
			blocks: [
				{ type: 'p', text: s.loginP1 },
				{ type: 'steps', items: s.loginSteps },
				{ type: 'p', text: s.loginForgot },
				{ type: 'p', text: s.loginOut },
			],
		},
		{
			id: 'panel',
			title: s.panelTitle,
			blocks: [{ type: 'p', text: s.panelP1 }, { type: 'list', items: s.panelItems }],
		},
		{
			id: 'create',
			title: c.title,
			blocks: [
				{ type: 'p', text: c.lead },
				{ type: 'steps', items: c.steps },
				{ type: 'p', text: c.confirm },
				{ type: 'p', text: c.empty },
			],
		},
		{
			id: 'fields',
			title: f.title,
			blocks: [{ type: 'p', text: f.lead }, pairs(f.pairs)],
		},
		{
			id: 'editor',
			title: f.editorTitle,
			blocks: [{ type: 'p', text: f.editorP }],
		},
		{
			id: 'media',
			title: f.mediaTitle,
			blocks: [pairs(f.mediaPairs)],
		},
		{
			id: 'actions',
			title: f.actionsTitle,
			blocks: [pairs(f.actionsPairs), { type: 'p', text: f.amendment }],
		},
		{
			id: 'status',
			title: st.title,
			blocks: [{ type: 'p', text: st.lead }, pairs(st.pairs)],
		},
		{
			id: 'after',
			title: st.afterTitle,
			blocks: [{ type: 'p', text: st.afterP }, pairs(st.afterPairs)],
		},
		{
			id: 'faq',
			title: help.faq.title,
			blocks: [{ type: 'p', text: help.faq.lead }, pairs(help.faq.pairs)],
		},
	];
}

export const EDITOR_HELP_SECTION_IDS = [
	'start',
	'login',
	'panel',
	'create',
	'fields',
	'editor',
	'media',
	'actions',
	'status',
	'after',
	'faq',
] as const;

import type { CategoryOption } from '@/lib/categories';
import type { InboundDraftConfig } from './config';
import type { CreateInboundDraftInput, CreateInboundDraftResult } from './create-draft';
import type { EnrichInboundInput } from './enrich';
import type { EnrichOutcome } from './enrich-outcome';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { AttachmentDecision } from './attachment-assign';
import type { InboundMessageRow } from './inbound-message-model';
import type { ReplaceMatch } from './match-replace-model';
import type { ApplyReplaceInput, ApplyReplaceResult } from './apply-replace';
import type { ReceivedInboundEmail } from './receiving';

export type ApplyInboundAttachmentsFn = (input: {
	postId: string;
	emailId: string;
	contentMd: string;
	decisions?: Map<string, AttachmentDecision>;
}) => Promise<void>;

export type InboundNotifyFn = (
	postId: string | null,
	title: string,
	opts?: { kind?: 'draft' | 'replace' | 'clarify' | 'failed'; question?: string; panelUrl?: string; siteId?: string; pageId?: string },
) => Promise<void>;

export type InboundEmailDeps = {
	secret?: string | null;
	nowSec?: number;
	apiKey?: string | null;
	draftConfig?: InboundDraftConfig | null;
	fetchEmail?: (emailId: string) => Promise<ReceivedInboundEmail | null>;
	createDraft?: (input: CreateInboundDraftInput) => Promise<CreateInboundDraftResult>;
	applyAttachments?: ApplyInboundAttachmentsFn;
	notify?: InboundNotifyFn;
	collectInventory?: (emailId: string) => Promise<InboundFileInventory[]>;
	loadCategories?: (siteSlug: string) => Promise<CategoryOption[]>;
	loadSiteName?: (siteSlug: string) => Promise<string>;
	enrich?: (input: EnrichInboundInput) => Promise<EnrichOutcome>;
	aiConfigured?: boolean;
	forgetPrevious?: (emailId: string) => Promise<void>;
	deferIngest?: boolean;
	schedule?: (task: Promise<unknown>) => void;
	findInbound?: (messageId: string) => Promise<InboundMessageRow | null>;
	recordInbound?: (row: {
		messageId: string;
		fromEmail: string;
		status: InboundMessageRow['status'];
		postId?: string | null;
		pageId?: string | null;
		sourceMessageId?: string | null;
	}) => Promise<{ ok: true; created: boolean } | { ok: false }>;
	sendClarify?: (input: {
		to: string;
		subject: string;
		text: string;
		messageId: string;
	}) => Promise<boolean>;
	matchReplace?: (siteSlug: string, hint: string, filename?: string | null) => Promise<ReplaceMatch>;
	applyReplace?: (input: ApplyReplaceInput) => Promise<ApplyReplaceResult>;
};

import type { CategoryOption } from '@/lib/categories';
import type { InboundDraftConfig } from './config';
import type { CreateInboundDraftInput, CreateInboundDraftResult } from './create-draft';
import type { EnrichInboundInput } from './enrich';
import type { EnrichDraft } from './enrich-model';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { AttachmentDecision } from './attachment-assign';
import type { ReceivedInboundEmail } from './receiving';

export type ApplyInboundAttachmentsFn = (input: {
	postId: string;
	emailId: string;
	contentMd: string;
	decisions?: Map<string, AttachmentDecision>;
}) => Promise<void>;

export type InboundEmailDeps = {
	secret?: string | null;
	nowSec?: number;
	apiKey?: string | null;
	draftConfig?: InboundDraftConfig | null;
	fetchEmail?: (emailId: string) => Promise<ReceivedInboundEmail | null>;
	createDraft?: (input: CreateInboundDraftInput) => Promise<CreateInboundDraftResult>;
	applyAttachments?: ApplyInboundAttachmentsFn;
	notify?: (postId: string, title: string, opts?: { unprocessed?: boolean }) => Promise<void>;
	collectInventory?: (emailId: string) => Promise<InboundFileInventory[]>;
	loadCategories?: (siteSlug: string) => Promise<CategoryOption[]>;
	enrich?: (input: EnrichInboundInput) => Promise<EnrichDraft[]>;
	aiConfigured?: boolean;
	forgetPrevious?: (emailId: string) => Promise<void>;
};

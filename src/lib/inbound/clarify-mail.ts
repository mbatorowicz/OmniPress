import { inbound } from '@/i18n';
import { inboundClarifyMessageId } from './mailbox';
import type { ReplaceCandidate } from './match-replace-model';
import { candidatePanelUrl } from './match-replace-model';

export function inboundClarifySubject(originalSubject: string): string {
	const base = originalSubject.replace(/^(re|fwd?|odp\.?)\s*:\s*/i, '').trim() || inbound.mail.fallbackSubject;
	return `Re: ${base}`;
}

export function inboundClarifyBody(
	question: string,
	candidates: ReplaceCandidate[] = [],
): string {
	const lines = [inbound.mail.clarifyIntro, '', question.trim(), '', inbound.mail.clarifyAsk];
	if (candidates.length > 0) {
		lines.push('', inbound.mail.candidatesHeading);
		for (const candidate of candidates) {
			lines.push(inbound.mail.candidateLine(candidate.title, candidatePanelUrl(candidate)));
		}
	}
	return lines.join('\n');
}

export function inboundClarifyMail(input: {
	emailId: string;
	to: string;
	subject: string;
	question: string;
	candidates?: ReplaceCandidate[];
}): { to: string; subject: string; text: string; messageId: string } {
	return {
		to: input.to,
		subject: inboundClarifySubject(input.subject),
		text: inboundClarifyBody(input.question, input.candidates ?? []),
		messageId: inboundClarifyMessageId(input.emailId),
	};
}

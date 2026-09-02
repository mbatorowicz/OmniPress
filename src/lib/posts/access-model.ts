/**
 * Reguły dostępu do wpisu — czysta logika (bez Supabase), żeby mogły z nich
 * korzystać także komponenty UI. Odczyt wpisu i wersje `load*`: `access.ts`.
 */
import type { PostStatus, UserRole } from '../types';

export type PostRow = {
	id: string;
	/** Null po usunięciu konta autora (FK on delete set null). */
	author_id: string | null;
	site_id: string;
	title: string;
	content_md: string;
	slug: string | null;
	status: PostStatus;
	rejection_note: string | null;
	category_slug: string | null;
	category_name: string | null;
	scheduled_publish_at: string | null;
	pinned: boolean;
};

/** Redaktor poprawia własny wpis tylko przed wysłaniem do akceptacji. */
const AUTHOR_EDITABLE_STATUSES: readonly PostStatus[] = ['draft', 'rejected'];

/**
 * Administrator poprawia wpis dopóki treść nie ruszyła na stronę — także po
 * wysłaniu do akceptacji (`pending`) i po zaplanowaniu publikacji (`scheduled`).
 * `publishing` i `published` są wyłączone: tam wchodzi się przez poprawkę
 * (`reopen`) albo zdjęcie ze strony.
 */
const ADMIN_EDITABLE_STATUSES: readonly PostStatus[] = [
	'draft',
	'rejected',
	'pending',
	'scheduled',
];

/** Czy administrator może poprawić wpis w tym statusie (bez pełnego wiersza). */
export function isAdminEditableStatus(status: PostStatus): boolean {
	return ADMIN_EDITABLE_STATUSES.includes(status);
}

export function canAdminEditPost(post: PostRow): boolean {
	return isAdminEditableStatus(post.status);
}

export function canEditPost(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return canAdminEditPost(post);
	return post.author_id === userId && AUTHOR_EDITABLE_STATUSES.includes(post.status);
}

/** Podgląd załączników (PDF) — admin: każdy wpis; redaktor: własne. */
export function canViewPostAssets(post: PostRow, userId: string, role: UserRole): boolean {
	if (role === 'admin') return true;
	return post.author_id === userId;
}

export function canSubmitPost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && (post.status === 'draft' || post.status === 'rejected');
}

/** Redaktor usuwa tylko własne wpisy przed publikacją (szkic / odrzucony). */
export function canDeletePost(post: PostRow, userId: string): boolean {
	return post.author_id === userId && (post.status === 'draft' || post.status === 'rejected');
}

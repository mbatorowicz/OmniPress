export { mapAuthError } from '@/i18n/map-auth-error';
export {
	ADMIN_API_PREFIX,
	AUTH_API_PREFIX,
	isAdminApiPath,
	isProtectedPath,
	isPublicPath,
	PROTECTED_PREFIXES,
	PUBLIC_PATHS,
	roleHomePath,
} from './routes';
export { getProfile, getSessionUser, getUserSites } from './session';
export { requireAuth, type AuthSession } from './require';
export { authCodeRedirectTarget, isPasswordRecoveryRedirect } from './recovery-redirect';

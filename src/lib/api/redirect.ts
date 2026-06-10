type RedirectFn = (path: string) => Response;

/** Redirect z parametrami query (formularze HTML). */
export function redirectWithQuery(
	redirect: RedirectFn,
	path: string,
	params: Record<string, string | number | boolean | undefined | null>,
): Response {
	const q = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value == null || value === '') continue;
		q.set(key, String(value));
	}
	const qs = q.toString();
	return redirect(qs ? `${path}?${qs}` : path);
}

export function redirectPostError(
	redirect: RedirectFn,
	path: string,
	error: string,
): Response {
	return redirectWithQuery(redirect, path, { error });
}

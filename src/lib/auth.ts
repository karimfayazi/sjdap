export function getUserIdFromCookie(): string | null {
	// Check if we're in a browser environment
	if (typeof window === "undefined" || typeof document === "undefined") {
		return null;
	}

	const authCookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith("auth="))
		?.split("=")[1];

	if (authCookie && authCookie.startsWith("authenticated:")) {
		return authCookie.split(":")[1];
	}
	return null;
}

export function getUserIdFromRequest(request: Request): string | null {
	const cookie = request.headers.get("cookie") || "";
	// Try multiple patterns to extract user ID from cookie
	const patterns = [
		/auth=authenticated:(.*?)(?:;|$)/,
		/auth="authenticated:(.*?)"/,
		/auth=authenticated%3A(.*?)(?:;|$)/  // URL encoded colon
	];
	
	for (const pattern of patterns) {
		const match = cookie.match(pattern);
		if (match && match[1]) {
			return decodeURIComponent(match[1]);
		}
	}
	
	return null;
}

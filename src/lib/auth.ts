/**
 * Safely extract userId from auth cookie value
 * Handles URL encoding, quotes, and various formats
 */
function extractUserIdFromCookieValue(cookieValue: string | null | undefined, context: string = 'unknown'): string | null {
	if (!cookieValue) {
		if (process.env.NODE_ENV === 'development') {
			console.log(`[extractUserIdFromCookieValue:${context}] No cookie value provided`);
		}
		return null;
	}
	
	// Log raw cookie value for debugging
	if (process.env.NODE_ENV === 'development') {
		console.log(`[extractUserIdFromCookieValue:${context}] Raw cookie value:`, cookieValue);
	}
	
	let decoded: string;
	
	// Safely decode URL encoding (handles %3A for colon)
	// Try decoding first - if it fails or doesn't change, use original
	try {
		const decodedAttempt = decodeURIComponent(cookieValue);
		// Only use decoded if it's different (was actually encoded)
		// This handles cases where decodeURIComponent doesn't throw but also doesn't decode
		decoded = decodedAttempt !== cookieValue ? decodedAttempt : cookieValue;
	} catch (error) {
		// Cookie value is not URL encoded, use as-is
		decoded = cookieValue;
	}
	
	// Log decoded value
	if (process.env.NODE_ENV === 'development') {
		console.log(`[extractUserIdFromCookieValue:${context}] Decoded cookie value:`, decoded);
	}
	
	// Remove quotes if present
	decoded = decoded.replace(/^["']|["']$/g, '');
	
	// Try to match authenticated:userId pattern
	// Handle both "authenticated:103" and "authenticated%3A103" (already decoded)
	// Also handle "authenticated103" (missing colon)
	const patterns = [
		/^authenticated:(.+)$/,  // Standard: authenticated:103
		/^authenticated%3A(.+)$/, // URL encoded: authenticated%3A103 (if not decoded)
		/^authenticated(.+)$/     // Fallback: authenticated103
	];
	
	for (const pattern of patterns) {
		const match = decoded.match(pattern);
		if (match && match[1]) {
			const userId = match[1].trim();
			if (process.env.NODE_ENV === 'development') {
				console.log(`[extractUserIdFromCookieValue:${context}] Extracted userId:`, userId);
			}
			return userId || null;
		}
	}
	
	if (process.env.NODE_ENV === 'development') {
		console.warn(`[extractUserIdFromCookieValue:${context}] No match found for pattern. Decoded value:`, decoded);
	}
	
	return null;
}

/**
 * Get userId from client-side cookie (browser)
 */
export function getUserIdFromCookie(): string | null {
	// Check if we're in a browser environment
	if (typeof window === "undefined" || typeof document === "undefined") {
		return null;
	}

	try {
		const rawCookieString = document.cookie;
		
		if (process.env.NODE_ENV === 'development') {
			console.log('[getUserIdFromCookie:CLIENT] Raw cookie string:', rawCookieString);
		}
		
		const authCookie = rawCookieString
			.split("; ")
			.find((row) => row.startsWith("auth="));
		
		if (!authCookie) {
			if (process.env.NODE_ENV === 'development') {
				console.log('[getUserIdFromCookie:CLIENT] No auth cookie found');
			}
			return null;
		}
		
		// Extract value after "auth="
		const cookieValue = authCookie.split("=").slice(1).join("="); // Handle values with = in them
		
		if (process.env.NODE_ENV === 'development') {
			console.log('[getUserIdFromCookie:CLIENT] Auth cookie found:', authCookie);
			console.log('[getUserIdFromCookie:CLIENT] Cookie value (before extraction):', cookieValue);
		}
		
		const userId = extractUserIdFromCookieValue(cookieValue, 'CLIENT');
		
		if (process.env.NODE_ENV === 'development') {
			console.log('[getUserIdFromCookie:CLIENT] Final userId result:', userId);
		}
		
		return userId;
	} catch (error) {
		console.error('[getUserIdFromCookie:CLIENT] Error parsing cookie:', error);
		return null;
	}
}

/**
 * Get userId from server-side Request object (raw cookie header)
 */
export function getUserIdFromRequest(request: Request): string | null {
	try {
		const cookie = request.headers.get("cookie") || "";
		// Try multiple patterns to extract user ID from cookie
		const patterns = [
			/auth=authenticated:(.*?)(?:;|$)/,
			/auth="authenticated:(.*?)"/,
			/auth=authenticated%3A(.*?)(?:;|$)/,  // URL encoded colon
			/auth=([^;]+)/  // Fallback: get entire auth cookie value
		];
		
		for (const pattern of patterns) {
			const match = cookie.match(pattern);
			if (match && match[1]) {
				const cookieValue = match[1];
				const userId = extractUserIdFromCookieValue(cookieValue);
				if (userId) return userId;
			}
		}
		
		return null;
	} catch (error) {
		console.error('[getUserIdFromRequest] Error parsing cookie:', error);
		return null;
	}
}

/**
 * Get userId from NextRequest cookies (Next.js App Router)
 * This is the recommended method for API routes
 */
export function getUserIdFromNextRequest(request: { cookies: { get: (name: string) => { value: string } | null } }): string | null {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			if (process.env.NODE_ENV === 'development') {
				console.log('[getUserIdFromNextRequest:SERVER] No auth cookie found');
			}
			return null;
		}
		
		if (process.env.NODE_ENV === 'development') {
			console.log('[getUserIdFromNextRequest:SERVER] Raw cookie value:', authCookie.value);
		}
		
		const userId = extractUserIdFromCookieValue(authCookie.value, 'SERVER');
		
		if (process.env.NODE_ENV === 'development') {
			console.log('[getUserIdFromNextRequest:SERVER] Final userId result:', userId);
		}
		
		return userId;
	} catch (error) {
		console.error('[getUserIdFromNextRequest:SERVER] Error parsing cookie:', error);
		return null;
	}
}

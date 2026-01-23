/**
 * Shared helper for normalizing API errors, especially database connection errors
 * Maps common connection errors to VPN_REQUIRED code for consistent user messaging
 */

export type ApiErrorType = 'VPN_REQUIRED' | 'TIMEOUT' | 'VALIDATION' | 'UNAUTHORIZED' | 'UNKNOWN';

export interface NormalizedError {
	type: ApiErrorType;
	message: string;
	statusCode: number;
}

/**
 * Normalizes errors to determine if they are VPN/connection related
 * @param error - The error object to analyze
 * @returns NormalizedError with type, message, and status code
 */
export function normalizeApiError(error: unknown): NormalizedError {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorName = error instanceof Error ? error.name : '';
	
	// Check for connection/database errors that indicate VPN is required
	const isConnectionError = 
		errorMessage.includes("ENOTFOUND") ||
		errorMessage.includes("getaddrinfo") ||
		errorMessage.includes("Failed to connect") ||
		errorMessage.includes("ECONNREFUSED") ||
		errorMessage.includes("ETIMEDOUT") ||
		errorMessage.includes("ConnectionError") ||
		errorMessage.includes("Connection is closed") ||
		errorMessage.includes("socket hang up") ||
		errorMessage.includes("ECONNRESET") ||
		errorName === "ConnectionError" ||
		errorName === "TimeoutError";
	
	// Check for timeout errors
	const isTimeoutError = 
		errorMessage.includes("Timeout") ||
		errorMessage.includes("timeout") ||
		errorMessage.includes("Request failed to complete") ||
		errorMessage.includes("ETIMEDOUT");
	
	if (isConnectionError) {
		return {
			type: 'VPN_REQUIRED',
			message: 'Please Re-Connect VPN',
			statusCode: 503
		};
	}
	
	if (isTimeoutError) {
		return {
			type: 'TIMEOUT',
			message: 'Request timeout. The query is taking too long. Please try again or contact support if the issue persists.',
			statusCode: 504
		};
	}
	
	// Default to unknown error
	return {
		type: 'UNKNOWN',
		message: errorMessage || 'An unexpected error occurred',
		statusCode: 500
	};
}

/**
 * Creates a standardized error response for API routes
 * @param error - The error to normalize
 * @param customMessage - Optional custom message (overrides normalized message)
 * @returns NextResponse-compatible JSON response object
 */
export function createErrorResponse(error: unknown, customMessage?: string): {
	success: false;
	message: string;
	code?: string;
} {
	const normalized = normalizeApiError(error);
	
	return {
		success: false,
		message: customMessage || normalized.message,
		code: normalized.type === 'VPN_REQUIRED' ? 'VPN_REQUIRED' : undefined
	};
}

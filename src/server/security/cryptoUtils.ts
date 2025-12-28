import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

/**
 * Safe error message that doesn't leak sensitive information
 */
export function getSafeErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		// Filter out sensitive patterns (case-insensitive)
		const message = error.message.toLowerCase();

		// Don't expose database errors
		if (message.includes('mongo')) {
			return 'Database operation failed';
		}

		// Don't expose file paths
		if (message.includes('/') || message.includes('\\')) {
			return 'File operation failed';
		}

		// Don't expose validation details from internal libraries
		if (message.includes('validation') || message.includes('cast')) {
			return 'Invalid input';
		}

		// Generic safe messages
		return 'Operation failed';
	}

	return 'Internal server error';
}

/**
 * Validate and sanitize Content-Disposition filename
 */
export function sanitizeContentDispositionFilename(filename: string): string {
	// Remove any path components
	const basename = filename.replace(/^.*[\\\/]/, '');

	// Remove or encode dangerous characters
	return basename
		.replace(/["\r\n]/g, '')
		.replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
		.slice(0, 255);
}

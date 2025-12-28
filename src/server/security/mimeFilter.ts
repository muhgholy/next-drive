/**
 * Validate MIME type against allowed patterns
 * Supports glob patterns like "image/*" or exact matches like "application/pdf"
 */
export function validateMimeType(mime: string, allowedTypes: string[]): boolean {
    // Allow all if wildcard
    if (allowedTypes.includes('*/*')) {
        return true;
    }

    for (const pattern of allowedTypes) {
        // Exact match
        if (pattern === mime) {
            return true;
        }

        // Glob pattern match (e.g., "image/*")
        if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -2); // Remove "/*"
            if (mime.startsWith(`${prefix}/`)) {
                return true;
            }
        }
    }

    return false;
}

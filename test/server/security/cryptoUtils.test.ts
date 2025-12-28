// ** Security Tests - Crypto Utilities
import { describe, it, expect } from 'vitest';
import { constantTimeCompare, getSafeErrorMessage, sanitizeContentDispositionFilename } from '@/server/security/cryptoUtils';

describe('Security - Crypto Utilities', () => {
	describe('constantTimeCompare', () => {
		it('should return true for identical strings', () => {
			const a = 'abc123';
			const b = 'abc123';
			expect(constantTimeCompare(a, b)).toBe(true);
		});

		it('should return false for different strings', () => {
			const a = 'abc123';
			const b = 'abc124';
			expect(constantTimeCompare(a, b)).toBe(false);
		});

		it('should return false for different lengths', () => {
			const a = 'abc123';
			const b = 'abc1234';
			expect(constantTimeCompare(a, b)).toBe(false);
		});

		it('should have constant time for same-length strings', () => {
			const iterations = 10000; // More iterations for better averaging
			const correct = 'a'.repeat(100);
			const wrong1 = 'b' + 'a'.repeat(99); // First char different
			const wrong2 = 'a'.repeat(99) + 'b'; // Last char different

			// Time comparison with first char different
			const start1 = performance.now();
			for (let i = 0; i < iterations; i++) {
				constantTimeCompare(correct, wrong1);
			}
			const time1 = performance.now() - start1;

			// Time comparison with last char different
			const start2 = performance.now();
			for (let i = 0; i < iterations; i++) {
				constantTimeCompare(correct, wrong2);
			}
			const time2 = performance.now() - start2;

			// Times should be within 3x of each other (lenient for system variance)
			// In a truly constant-time implementation, they should be nearly identical
			const ratio = Math.max(time1, time2) / Math.min(time1, time2);
			expect(ratio).toBeLessThan(3);

			// Both times should be > 0
			expect(time1).toBeGreaterThan(0);
			expect(time2).toBeGreaterThan(0);
		});

		it('should handle empty strings', () => {
			expect(constantTimeCompare('', '')).toBe(true);
		});

		it('should handle special characters', () => {
			const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			expect(constantTimeCompare(special, special)).toBe(true);
		});
	});

	describe('getSafeErrorMessage', () => {
		it('should sanitize MongoDB errors', () => {
			const error = new Error('MongoError: connection failed');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('Database operation failed');
			expect(safe).not.toContain('Mongo');
		});

		it('should sanitize Mongoose errors', () => {
			const error = new Error('Mongoose validation failed');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('Database operation failed');
			expect(safe).not.toContain('Mongoose');
		});

		it('should sanitize file path errors', () => {
			const error = new Error('ENOENT: no such file /var/data/file.txt');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('File operation failed');
			expect(safe).not.toContain('/var');
		});

		it('should sanitize Windows path errors', () => {
			const error = new Error('Error: C:\\Users\\admin\\secret.txt not found');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('File operation failed');
			expect(safe).not.toContain('C:\\');
		});

		it('should sanitize validation errors', () => {
			const error = new Error('Cast to ObjectId failed for value "abc"');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('Invalid input');
			expect(safe).not.toContain('ObjectId');
		});

		it('should return generic message for other errors', () => {
			const error = new Error('Something went wrong');
			const safe = getSafeErrorMessage(error);
			expect(safe).toBe('Operation failed');
		});

		it('should handle non-Error objects', () => {
			const safe = getSafeErrorMessage('string error');
			expect(safe).toBe('Internal server error');
		});

		it('should handle null/undefined', () => {
			expect(getSafeErrorMessage(null)).toBe('Internal server error');
			expect(getSafeErrorMessage(undefined)).toBe('Internal server error');
		});
	});

	describe('sanitizeContentDispositionFilename', () => {
		it('should remove path components', () => {
			const result = sanitizeContentDispositionFilename('/path/to/file.txt');
			expect(result).toBe('file.txt');
		});

		it('should remove Windows path components', () => {
			const result = sanitizeContentDispositionFilename('C:\\Users\\admin\\file.txt');
			expect(result).toBe('file.txt');
		});

		it('should remove quotes', () => {
			const result = sanitizeContentDispositionFilename('file"name".txt');
			expect(result).toBe('filename.txt');
		});

		it('should remove newlines and carriage returns', () => {
			const result = sanitizeContentDispositionFilename('file\nname\r.txt');
			expect(result).toBe('filename.txt');
		});

		it('should remove non-printable ASCII', () => {
			const result = sanitizeContentDispositionFilename('file\x00\x01\x02name.txt');
			expect(result).toBe('filename.txt');
		});

		it('should limit length to 255 characters', () => {
			const longName = 'a'.repeat(300) + '.txt';
			const result = sanitizeContentDispositionFilename(longName);
			expect(result.length).toBeLessThanOrEqual(255);
		});

		it('should preserve safe characters', () => {
			const result = sanitizeContentDispositionFilename('my-file_name (1).txt');
			expect(result).toBe('my-file_name (1).txt');
		});
	});
});

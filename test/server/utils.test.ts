// ** Server Utils Tests
import { describe, it, expect } from 'vitest';
import { isImageMimeType, validateMimeType, formatFileSize, ownerMatches } from '@/server/utils';

describe('Server Utils', () => {
    describe('isImageMimeType', () => {
        it('should return true for supported image types', () => {
            expect(isImageMimeType('image/jpeg')).toBe(true);
            expect(isImageMimeType('image/png')).toBe(true);
            expect(isImageMimeType('image/webp')).toBe(true);
        });

        it('should return false for unsupported types', () => {
            expect(isImageMimeType('application/pdf')).toBe(false);
            expect(isImageMimeType('video/mp4')).toBe(false);
        });
    });

    describe('validateMimeType', () => {
        it('should allow wildcard matching', () => {
            expect(validateMimeType('image/png', ['*/*'])).toBe(true);
            expect(validateMimeType('image/jpeg', ['image/*'])).toBe(true);
        });

        it('should allow exact matching', () => {
            expect(validateMimeType('application/pdf', ['application/pdf'])).toBe(true);
        });

        it('should reject non-matching types', () => {
            expect(validateMimeType('video/mp4', ['image/*'])).toBe(false);
        });
    });

    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            expect(formatFileSize(0)).toBe('0 B');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(formatFileSize(1500)).toBe('1.5 KB');
        });
    });

    describe('ownerMatches', () => {
        it('should return true if both are null', () => {
            expect(ownerMatches(null, null)).toBe(true);
        });

        it('should return false if one is null', () => {
            expect(ownerMatches({ id: 1 }, null)).toBe(false);
            expect(ownerMatches(null, { id: 1 })).toBe(false);
        });

        it('should return true for matching objects', () => {
            expect(ownerMatches({ id: 1 }, { id: 1 })).toBe(true);
        });

        it('should return false for different objects', () => {
            expect(ownerMatches({ id: 1 }, { id: 2 })).toBe(false);
        });
    });
});

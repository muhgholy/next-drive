// ** Client Utils Tests
import { describe, it, expect } from 'vitest';
import { formatBytes, getFileIcon, matchesMimeFilter } from '@/client/utils';

describe('Client Utils', () => {
    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1234)).toBe('1.21 KB'); // Default 2 decimals
        });
    });

    describe('getFileIcon', () => {
        it('should return folder icon', () => {
            const icon = getFileIcon('anything', true);
            expect(typeof icon).toBe('object');
            expect(icon).not.toBeNull();
        });

        it('should return correct icon for types', () => {
            expect(typeof getFileIcon('image/png', false)).toBe('object');
            expect(typeof getFileIcon('video/mp4', false)).toBe('object');
            expect(typeof getFileIcon('application/pdf', false)).toBe('object');
            expect(typeof getFileIcon('audio/mp3', false)).toBe('object');
        });

        it('should return default for unknown', () => {
            expect(typeof getFileIcon('unknown/type', false)).toBe('object');
        });
    });

    describe('matchesMimeFilter', () => {
        it('should always match folders', () => {
            expect(matchesMimeFilter('any', true, 'image/*')).toBe(true);
        });

        it('should match wildcards', () => {
            expect(matchesMimeFilter('image/png', false, 'image/*')).toBe(true);
            expect(matchesMimeFilter('application/json', false, '*/*')).toBe(true);
        });

        it('should match comma-separated lists', () => {
            expect(matchesMimeFilter('image/png', false, 'image/jpeg, image/png')).toBe(true);
        });

        it('should NOT match incorrect types', () => {
            expect(matchesMimeFilter('video/mp4', false, 'image/*')).toBe(false);
        });
    });
});

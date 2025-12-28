// ** Security Tests - Zod Schemas
import { describe, it, expect } from 'vitest';
import * as schemas from '@/server/zod/schemas';

describe('Security - Zod Schema Validation', () => {
	describe('sanitizeFilename', () => {
		it('should remove path traversal sequences', () => {
			const result = schemas.sanitizeFilename('../../../etc/passwd');
			expect(result).not.toContain('..');
			expect(result).not.toContain('/');
			expect(result).toBe('passwd'); // Only filename remains
		});

		it('should remove dangerous characters', () => {
			const result = schemas.sanitizeFilename('file<>:"|?*.txt');
			expect(result).not.toContain('<');
			expect(result).not.toContain('>');
			expect(result).not.toContain(':');
			expect(result).not.toContain('|');
			expect(result).not.toContain('?');
			expect(result).not.toContain('*');
			expect(result).toBe('file.txt');
		});

		it('should remove null bytes', () => {
			const result = schemas.sanitizeFilename('file\x00.txt');
			expect(result).toBe('file.txt');
		});

		it('should remove leading and trailing dots', () => {
			expect(schemas.sanitizeFilename('.hidden')).toBe('hidden');
			expect(schemas.sanitizeFilename('file...')).toBe('file');
			expect(schemas.sanitizeFilename('...file...')).toBe('file');
		});

		it('should normalize slashes', () => {
			const result = schemas.sanitizeFilename('folder\\\\file//name.txt');
			expect(result).toBe('name.txt'); // Only filename remains
		});
	});

	describe('sanitizeRegexInput', () => {
		it('should escape regex special characters', () => {
			const input = '.*+?^${}()|[]\\';
			const result = schemas.sanitizeRegexInput(input);
			expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
		});

		it('should prevent ReDoS attacks', () => {
			const malicious = '(a+)+';
			const result = schemas.sanitizeRegexInput(malicious);
			expect(result).toBe('\\(a\\+\\)\\+');
		});

		it('should limit length to 100 characters', () => {
			const longInput = 'a'.repeat(200);
			const result = schemas.sanitizeRegexInput(longInput);
			expect(result.length).toBeLessThanOrEqual(100);
		});
	});

	describe('uploadChunkSchema', () => {
		it('should validate valid chunk data', () => {
			const result = schemas.uploadChunkSchema.safeParse({
				chunkIndex: 0,
				totalChunks: 10,
				fileName: 'test.pdf',
				fileSize: 1024,
				fileType: 'application/pdf',
			});
			expect(result.success).toBe(true);
		});

		it('should reject negative chunk index', () => {
			const result = schemas.uploadChunkSchema.safeParse({
				chunkIndex: -1,
				totalChunks: 10,
				fileName: 'test.pdf',
				fileSize: 1024,
				fileType: 'application/pdf',
			});
			expect(result.success).toBe(false);
		});

		it('should reject chunk index >= total chunks', () => {
			const result = schemas.uploadChunkSchema.safeParse({
				chunkIndex: 10,
				totalChunks: 10,
				fileName: 'test.pdf',
				fileSize: 1024,
				fileType: 'application/pdf',
			});
			expect(result.success).toBe(false);
		});

		it('should reject excessive total chunks', () => {
			const result = schemas.uploadChunkSchema.safeParse({
				chunkIndex: 0,
				totalChunks: 20000,
				fileName: 'test.pdf',
				fileSize: 1024,
				fileType: 'application/pdf',
			});
			expect(result.success).toBe(false);
		});

		it('should sanitize malicious filename', () => {
			const result = schemas.uploadChunkSchema.safeParse({
				chunkIndex: 0,
				totalChunks: 10,
				fileName: '../../../etc/passwd',
				fileSize: 1024,
				fileType: 'application/pdf',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.fileName).not.toContain('..');
			}
		});
	});

	describe('listQuerySchema', () => {
		it('should validate valid list query', () => {
			const result = schemas.listQuerySchema.safeParse({
				folderId: 'root',
				limit: '50',
			});
			expect(result.success).toBe(true);
		});

		it('should enforce min limit of 1', () => {
			const result = schemas.listQuerySchema.safeParse({
				limit: '0',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(1);
			}
		});

		it('should enforce max limit of 100', () => {
			const result = schemas.listQuerySchema.safeParse({
				limit: '1000',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(100);
			}
		});

		it('should reject invalid ObjectId for afterId', () => {
			const result = schemas.listQuerySchema.safeParse({
				afterId: 'not-a-valid-objectid',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('searchQuerySchema', () => {
		it('should sanitize search query', () => {
			const result = schemas.searchQuerySchema.safeParse({
				q: '.*',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.q).toBe('\\.\\*');
			}
		});

		it('should reject empty search query', () => {
			const result = schemas.searchQuerySchema.safeParse({
				q: '',
			});
			expect(result.success).toBe(false);
		});

		it('should limit search query length', () => {
			const result = schemas.searchQuerySchema.safeParse({
				q: 'a'.repeat(200),
			});
			// Schema has max(100), so 200 chars should be rejected after transform
			expect(result.success).toBe(false);
		});
	});

	describe('deleteManyBodySchema', () => {
		it('should validate array of ObjectIds', () => {
			const result = schemas.deleteManyBodySchema.safeParse({
				ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty array', () => {
			const result = schemas.deleteManyBodySchema.safeParse({
				ids: [],
			});
			expect(result.success).toBe(false);
		});

		it('should reject more than 1000 items', () => {
			const ids = Array(1001)
				.fill(0)
				.map(() => '507f1f77bcf86cd799439011');
			const result = schemas.deleteManyBodySchema.safeParse({
				ids,
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid ObjectIds', () => {
			const result = schemas.deleteManyBodySchema.safeParse({
				ids: ['invalid-id'],
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createFolderBodySchema', () => {
		it('should validate folder name', () => {
			const result = schemas.createFolderBodySchema.safeParse({
				name: 'My Folder',
			});
			expect(result.success).toBe(true);
		});

		it('should sanitize folder name', () => {
			const result = schemas.createFolderBodySchema.safeParse({
				name: '../../../etc',
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).not.toContain('..');
			}
		});

		it('should reject empty name', () => {
			const result = schemas.createFolderBodySchema.safeParse({
				name: '',
			});
			expect(result.success).toBe(false);
		});

		it('should reject name that becomes empty after sanitization', () => {
			const result = schemas.createFolderBodySchema.safeParse({
				name: '...',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('moveBodySchema', () => {
		it('should validate move operation', () => {
			const result = schemas.moveBodySchema.safeParse({
				ids: ['507f1f77bcf86cd799439011'],
				targetFolderId: '507f1f77bcf86cd799439012',
			});
			expect(result.success).toBe(true);
		});

		it('should allow moving to root', () => {
			const result = schemas.moveBodySchema.safeParse({
				ids: ['507f1f77bcf86cd799439011'],
				targetFolderId: 'root',
			});
			expect(result.success).toBe(true);
		});

		it('should enforce max 1000 items', () => {
			const ids = Array(1001)
				.fill(0)
				.map(() => '507f1f77bcf86cd799439011');
			const result = schemas.moveBodySchema.safeParse({
				ids,
				targetFolderId: 'root',
			});
			expect(result.success).toBe(false);
		});
	});
});

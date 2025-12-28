// ** Drive Controller Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextOrderValue, getStorageUsed } from '@/server/controllers/drive';
import Drive from '@/server/database/mongoose/schema/drive';

// Mock the model
vi.mock('@/server/database/mongoose/schema/drive', () => ({
    default: {
        findOne: vi.fn(),
        aggregate: vi.fn(),
        find: vi.fn(),
    },
}));

describe('Drive Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getNextOrderValue', () => {
        it('should return 0 when no items exist', async () => {
            // Mock findOne to return null (no items)
            vi.mocked(Drive.findOne).mockResolvedValueOnce(null);
            const order = await getNextOrderValue({ id: 'user1' });
            expect(order).toBe(0);
        });

        it('should return last order + 1', async () => {
            // Mock findOne to return an item with order 5
            vi.mocked(Drive.findOne).mockResolvedValueOnce({ order: 5 } as any);
            const order = await getNextOrderValue({ id: 'user1' });
            expect(order).toBe(6);
        });
    });

    describe('getStorageUsed', () => {
        it('should return 0 when no files found', async () => {
            // Mock aggregate to return empty array
            vi.mocked(Drive.aggregate).mockResolvedValueOnce([]);
            const used = await getStorageUsed({ id: 'user1' });
            expect(used).toBe(0);
        });

        it('should return total size from aggregation', async () => {
            // Mock aggregate to return summed size
            vi.mocked(Drive.aggregate).mockResolvedValueOnce([{ total: 102400 }]);
            const used = await getStorageUsed({ id: 'user1' });
            expect(used).toBe(102400);
        });
    });
});

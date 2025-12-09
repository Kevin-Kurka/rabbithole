import { MediaProcessingResolver } from '../resolvers/MediaProcessingResolver';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { v4 as uuidv4 } from 'uuid';
import { Stream } from 'stream';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('uuid');
jest.mock('../services/MediaQueueService', () => ({
    mediaQueueService: {
        enqueueMediaProcessing: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock GraphQL Upload
const mockFile = {
    createReadStream: () => {
        const stream = new Stream.Readable();
        stream.push(null);
        return stream;
    },
    filename: 'test-audio.mp3',
    mimetype: 'audio/mpeg',
    encoding: '7bit',
};

describe('MediaProcessingResolver', () => {
    let resolver: MediaProcessingResolver;
    let mockPool: any;
    let mockPubSub: any;
    let mockContext: any;

    beforeEach(() => {
        jest.clearAllMocks();

        resolver = new MediaProcessingResolver();

        mockPool = {
            query: jest.fn(),
            connect: jest.fn(),
        };

        mockPubSub = {
            publish: jest.fn(),
        };

        mockContext = {
            pool: mockPool,
            pubSub: mockPubSub,
            userId: 'user-123',
        };

        (uuidv4 as jest.Mock).mockReturnValue('uuid-123');
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.createWriteStream as jest.Mock).mockReturnValue({
            on: (event: string, callback: any) => {
                if (event === 'finish') callback();
            },
        });
        (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
    });

    describe('uploadAndTranscribeAudio', () => {
        it('should upload file and enqueue processing job', async () => {
            // Mock Node/Edge Lookups
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'type-media-file' }] }) // MediaFile Type
                .mockResolvedValueOnce(undefined) // Insert Node
                .mockResolvedValueOnce({ rows: [{ id: 'type-processed-by' }] }) // PROCESSED_BY Edge Type
                .mockResolvedValueOnce(undefined); // Insert Edge

            const result = await resolver.uploadAndTranscribeAudio(
                Promise.resolve(mockFile) as any,
                mockContext,
                { language: 'en' }
            );

            expect(result).toEqual({
                jobId: 'uuid-123',
                fileId: 'uuid-123',
                status: 'queued',
                progress: 0,
            });

            // Verify DB interactions
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO public.nodes'),
                expect.any(Array)
            );

            // Verify Edges
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO public.edges'),
                expect.any(Array)
            );
        });

        it('should reject unsupported file types', async () => {
            const badFile = { ...mockFile, mimetype: 'image/png' };

            await expect(resolver.uploadAndTranscribeAudio(
                Promise.resolve(badFile) as any,
                mockContext
            )).rejects.toThrow('Unsupported audio format');
        });
    });

    describe('uploadAndAnalyzeVideo', () => {
        it('should upload video and enqueue analysis job', async () => {
            const mockVideo = { ...mockFile, filename: 'test.mp4', mimetype: 'video/mp4' };

            // Mock Node/Edge Lookups
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'type-media-file' }] }) // MediaFile Type
                .mockResolvedValueOnce(undefined) // Insert Node
                .mockResolvedValueOnce({ rows: [{ id: 'type-processed-by' }] }) // PROCESSED_BY Edge Type
                .mockResolvedValueOnce(undefined); // Insert Edge

            const result = await resolver.uploadAndAnalyzeVideo(
                Promise.resolve(mockVideo) as any,
                mockContext,
                { extractFrames: true }
            );

            expect(result).toEqual({
                jobId: 'uuid-123',
                fileId: 'uuid-123',
                status: 'queued',
                progress: 0,
            });
        });
    });
});

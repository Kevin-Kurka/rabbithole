
import { UserResolver } from '../resolvers/UserResolver';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { User } from '../types/GraphTypes';

// Mock dependencies
jest.mock('pg');
jest.mock('bcrypt');
jest.mock('../middleware/auth', () => ({
    generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
}));

const mockPool: any = {
    query: jest.fn(),
};

const mockPubSub: any = {
    publish: jest.fn(),
};

describe('UserResolver', () => {
    let resolver: UserResolver;

    beforeEach(() => {
        resolver = new UserResolver();
        jest.clearAllMocks();
    });

    describe('me', () => {
        it('should return user when userId provided', async () => {
            const mockUserNode = {
                id: 'user-123',
                props: JSON.stringify({
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user'
                }),
                created_at: new Date(),
                updated_at: new Date()
            };

            (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockUserNode] });

            const result = await resolver.me({ userId: 'user-123', pool: mockPool });

            expect(result).toBeDefined();
            expect(result?.id).toBe('user-123');
            expect(result?.username).toBe('testuser');
        });

        it('should return null when userId is null', async () => {
            const result = await resolver.me({ userId: null, pool: mockPool });
            expect(result).toBeNull();
        });

        it('should return null when user not found in db', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
            const result = await resolver.me({ userId: 'missing-id', pool: mockPool });
            expect(result).toBeNull();
        });
    });

    describe('register', () => {
        const input = {
            username: 'newuser',
            email: 'new@example.com',
            password: 'password123'
        };

        it('should register new user', async () => {
            // 1. Get Node Type
            (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 'type-user-id' }] })
                // 2. Check Existing
                .mockResolvedValueOnce({ rows: [] })
                // 3. Insert Node
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'new-user-id',
                        props: JSON.stringify({
                            username: input.username,
                            email: input.email,
                            role: 'user'
                        }),
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                });

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            const result = await resolver.register(
                input,
                { pool: mockPool, pubSub: mockPubSub }
            );

            expect(result.user.id).toBe('new-user-id');
            expect(result.accessToken).toBe('mock-access-token');
            expect(mockPubSub.publish).toHaveBeenCalledWith('NEW_USER', expect.objectContaining({
                id: 'new-user-id',
                username: input.username
            }));
            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });

        it('should throw if user already exists', async () => {
            (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 'type-user-id' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }); // Found existing

            await expect(
                resolver.register(input, { pool: mockPool, pubSub: mockPubSub })
            ).rejects.toThrow('User with that email or username already exists');
        });
    });

    describe('login', () => {
        const input = {
            email: 'valid@example.com',
            password: 'password123',
            username: 'ignored_in_login' // Required by UserInput type
        };

        it('should login successfully with valid credentials', async () => {
            const storedHash = 'hashed-password';
            const mockUserNode = {
                id: 'user-123',
                props: JSON.stringify({
                    username: 'validuser',
                    email: input.email,
                    password_hash: storedHash
                }),
                created_at: new Date(),
                updated_at: new Date()
            };

            (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 'type-user-id' }] })
                .mockResolvedValueOnce({ rows: [mockUserNode] });

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await resolver.login(input, { pool: mockPool });

            expect(result).toBeDefined();
            expect(result?.user.username).toBe('validuser');
            expect(result?.accessToken).toBe('mock-access-token');
        });

        it('should throw on invalid password', async () => {
            const storedHash = 'hashed-password';
            const mockUserNode = {
                id: 'user-123',
                props: JSON.stringify({
                    username: 'validuser',
                    email: input.email,
                    password_hash: storedHash
                }),
                created_at: new Date(),
                updated_at: new Date()
            };

            (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 'type-user-id' }] })
                .mockResolvedValueOnce({ rows: [mockUserNode] });

            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                resolver.login(input, { pool: mockPool })
            ).rejects.toThrow('Invalid email or password');
        });

        it('should throw if user not found', async () => {
            (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ id: 'type-user-id' }] })
                .mockResolvedValueOnce({ rows: [] }); // User not found

            await expect(
                resolver.login(input, { pool: mockPool })
            ).rejects.toThrow('Invalid email or password');
        });
    });
});

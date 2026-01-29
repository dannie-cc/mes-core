import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { DrizzleService } from '@/models/model.service';
import { FilterService } from '@/common/services/filter.service';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { UpdateUserProfileDto } from '../users.dto';

describe('UsersService', () => {
    let service: UsersService;

    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true,
        roleId: '1',
        factoryId: 'factory-1',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        permissions: ['users.read', 'users.update'],
    };

    const mockPublicUser = {
        ...mockUser,
        role: {
            id: '1',
            name: 'Admin',
            description: '',
            permissions: ['*'],
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            deletedAt: null,
        },
        factory: {
            id: 'factory-1',
            name: 'Test Factory',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            deletedAt: null,
        },
    };

    let mockResponses: any[] = [];
    const mockDatabase: any = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        as: jest.fn().mockReturnThis(),
        transaction: jest.fn((cb) => cb(mockDatabase)),
        async then(onfulfilled: any, onrejected: any) {
            const next = mockResponses.shift();
            const val = next !== undefined ? next : [mockUser];
            // console.log(`DEBUG: Consuming response:`, val instanceof Error ? 'ERROR' : 'DATA');
            if (val instanceof Error) {
                return Promise.reject(val).then(onfulfilled, onrejected);
            }
            return Promise.resolve(val).then(onfulfilled, onrejected);
        },
    };

    const mockDrizzleService = {
        database: mockDatabase,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                FilterService,
                {
                    provide: DrizzleService,
                    useValue: mockDrizzleService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);

        jest.clearAllMocks();
        mockResponses = [];
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new user successfully', async () => {
            const newUserData = {
                email: 'newuser@example.com',
                password: 'password123',
                firstName: 'New',
                lastName: 'User',
                roleId: '1',
            };

            mockResponses = [[mockUser]];
            const result = await service.create(newUserData);

            expect(result).toEqual(mockUser);
            expect(mockDatabase.insert).toHaveBeenCalled();
            expect(mockDatabase.returning).toHaveBeenCalled();
        });

        it('should handle database errors during creation', async () => {
            const newUserData = {
                email: 'duplicate@example.com',
                password: 'password123',
                firstName: 'Duplicate',
                lastName: 'User',
                roleId: '1',
            };

            mockResponses = [new Error('Unique constraint violation')];
            await expect(service.create(newUserData)).rejects.toThrow('Unique constraint violation');
        });
    });

    describe('list', () => {
        it('should list users with default options', async () => {
            const mockResult = { data: [mockPublicUser], total: 1, page: 1, limit: 10 };
            mockResponses = [
                [mockPublicUser], // 1. select data
                [{ count: 1 }],   // 2. count query
            ];
            
            const query: PaginatedFilterQueryDto = { 
                page: 1, 
                limit: 10,
                filters: [],
                joinOperator: 'and',
                sortOrder: 'desc',
            };
            const result = await service.list(query, mockUser as any);
            
            expect(result.data).toEqual(mockResult.data);
            expect(result.total).toBe(1);
        });

        it('should list users with factory filter for non-admin', async () => {
            mockResponses = [
                [mockPublicUser], // 1. select data
                [{ count: 1 }],   // 2. count query
            ];
            
            const query: PaginatedFilterQueryDto = { 
                page: 1, 
                limit: 10,
                filters: [],
                joinOperator: 'and',
                sortOrder: 'desc',
            };
            const result = await service.list(query, mockUser as any);
            
            expect(result.data).toBeDefined();
        });

        it('should return empty result when no users found', async () => {
            mockResponses = [
                [],             // 1. select data (empty)
                [{ count: 0 }], // 2. count query
            ];

            const mockQuery: PaginatedFilterQueryDto = {
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc',
                filters: [],
                joinOperator: 'and',
            };

            const result = await service.list(mockQuery, mockUser as any);
            expect(result.data).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('findOne', () => {
        it('should return a user when found', async () => {
            mockResponses = [[mockPublicUser]];
            const result = await service.findOne('user-1');
            expect(result).toEqual(mockPublicUser);
        });

        it('should throw NotFoundException when user not found', async () => {
            mockResponses = [[]];
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByEmail', () => {
        it('should return a user by email', async () => {
            mockResponses = [[mockUser]];
            const result = await service.findByEmail('test@example.com');
            expect(result).toEqual(mockUser);
        });

        it('should return null when email not found', async () => {
            mockResponses = [[]];
            const result = await service.findByEmail('nonexistent@example.com');
            expect(result).toBeNull();
        });
    });

    describe('findByVerificationToken', () => {
        it('should return a user by verification token', async () => {
            mockResponses = [[mockUser]];
            const result = await service.findByVerificationToken('token123');
            expect(result).toEqual(mockUser);
        });

        it('should return null when token not found', async () => {
            mockResponses = [[]];
            const result = await service.findByVerificationToken('invalid-token');
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        const updateData: UpdateUserProfileDto = {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: undefined,
        };

        it('should update user successfully', async () => {
            const updatedPublicUser = { ...mockPublicUser, ...updateData };

            mockResponses = [
                [mockPublicUser], // 1. findOne at start of updateProfile
                [],               // 2. findByEmail check (empty = no conflict)
                [mockUser],       // 3. update returning
                [updatedPublicUser], // 4. final select
            ];

            const result = await service.updateProfile('user-1', updateData, mockUser as any);

            expect(result).toEqual(expect.objectContaining(updatedPublicUser));
            expect(mockDatabase.update).toHaveBeenCalled();
        });

        it('should throw ConflictException when email already exists', async () => {
            mockResponses = [
                [mockPublicUser], // 1. findOne
                [mockUser],       // 2. findByEmail (conflict!)
            ];

            await expect(service.updateProfile('user-1', updateData, mockUser as any)).rejects.toThrow(ConflictException);
        });

        it('should not check email conflict when email is not being updated', async () => {
            const updateWithoutEmail: UpdateUserProfileDto = { firstName: 'Jane', lastName: 'Smith', phone: undefined };
            const updatedPublicUser = { ...mockPublicUser, ...updateWithoutEmail };

            mockResponses = [
                [mockPublicUser], // 1. findOne
                [mockUser],       // 2. update returning
                [updatedPublicUser], // 3. final select
            ];

            const result = await service.updateProfile('user-1', updateWithoutEmail, mockUser as any);
            expect(result).toEqual(expect.objectContaining(updatedPublicUser));
        });

        it('should handle email update to same email', async () => {
            const sameEmailUpdate = { ...updateData, email: 'test@example.com' };
            const updatedPublicUser = { ...mockPublicUser, ...sameEmailUpdate };

            mockResponses = [
                [mockPublicUser], // 1. findOne
                [mockUser],       // 2. update
                [updatedPublicUser], // 3. final select
            ];

            const result = await service.updateProfile('user-1', sameEmailUpdate, mockUser as any);
            expect(result).toEqual(expect.objectContaining(updatedPublicUser));
        });

        it('should handle database errors gracefully', async () => {
            mockResponses = [
                [mockPublicUser], // 1. findOne
                [],               // 2. findByEmail
                new Error('Database connection lost'), // 3. update fails
            ];

            await expect(service.updateProfile('user-1', updateData, mockUser as any)).rejects.toThrow('Failed to update user: Database connection lost');
        });
    });

    describe('updateInternal', () => {
        it('should update user with any field including restricted ones', async () => {
            const internalUpdateData = {
                password: 'newhashedpassword',
                isVerified: true,
                verificationToken: null,
            };

            const updatedUser = { ...mockUser, ...internalUpdateData };
            mockResponses = [[updatedUser]];

            const result = await service.updateInternal('user-1', internalUpdateData);

            expect(result).toEqual(updatedUser);
            expect(mockDatabase.update).toHaveBeenCalled();
        });

        it('should handle empty update data', async () => {
            const emptyUpdate = {};
            mockResponses = [[mockUser]];

            const result = await service.updateInternal('user-1', emptyUpdate);

            expect(result).toEqual(mockUser);
        });
    });

    describe('softDelete', () => {
        it('should soft delete user successfully', async () => {
            const deletedUser = { ...mockUser, deletedAt: new Date() };
            mockResponses = [[deletedUser]];

            const result = await service.softDelete('user-1');

            expect(result).toEqual(deletedUser);
            expect(mockDatabase.update).toHaveBeenCalled();
        });
    });

    describe('restore', () => {
        it('should restore soft-deleted user successfully', async () => {
            const restoredUser = { ...mockUser, deletedAt: null };
            mockResponses = [[restoredUser]];

            const result = await service.restore('user-1');

            expect(result).toEqual(restoredUser);
            expect(mockDatabase.update).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should permanently delete user successfully', async () => {
            mockResponses = [[mockUser]];
            const result = await service.remove('user-1');
            expect(result).toEqual(mockUser);
            expect(mockDatabase.delete).toHaveBeenCalled();
        });
    });
});

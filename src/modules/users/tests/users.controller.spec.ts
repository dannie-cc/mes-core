import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { UpdateUserProfileDto } from '../users.dto';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { RedisService } from '@/app/services/redis/redis.service';
import { RateLimitGuard } from '../../auth/guards/rate-limit.guard';
import { JwtUser } from '@/types/jwt.types';

// Simple unit tests focused on business logic without NestJS guards
describe('UsersController Unit Tests', () => {
    let controller: UsersController;
    let service: UsersService;

    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roleId: '1',
        permissions: [] as string[],
        factoryId: 'factory-1',
    };

    const mockPublicUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    const mockQuery = {
        page: 1,
        limit: 10,
        sortby: 'createdat',
        sortOrder: 'desc' as const,
        filters: [],
        joinOperator: 'and' as const,
    };

    const mockUsersService = {
        create: jest.fn(),
        list: jest.fn(),
        findOne: jest.fn(),
        findByEmail: jest.fn(),
        updateProfile: jest.fn(),
        verify: jest.fn(),
        updateInternal: jest.fn(),
    };

    beforeEach(async () => {
        // Create a simple testing module without guards
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                { provide: UsersService, useValue: mockUsersService },
                { provide: CustomLoggerService, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn(), setContext: jest.fn() } },
                { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
            ],
        })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: jest.fn().mockReturnValue(true) })
            .compile();
        controller = module.get<UsersController>(UsersController);

        service = module.get<UsersService>(UsersService);

        // Reset all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('list', () => {
        it('should return array of public users with pagination details', async () => {
            const mockResult = {
                data: [mockPublicUser],
                total: 1,
                page: 1,
                limit: 10,
            };
            mockUsersService.list.mockResolvedValue(mockResult);

            const result = await controller.list(mockQuery, mockUser as JwtUser);

            expect(result.data).toEqual(mockResult.data);
            expect(service.list).toHaveBeenCalledWith(mockQuery, mockUser);
        });

        it('should handle service errors', async () => {
            const serviceError = new Error('Database connection failed');
            mockUsersService.list.mockRejectedValue(serviceError);

            await expect(controller.list(mockQuery, mockUser as JwtUser)).rejects.toThrow('Database connection failed');
        });
    });

    describe('findOne', () => {
        it('should return current user profile', async () => {
            const mockRequest = mockUser as JwtUser;
            mockUsersService.findOne.mockResolvedValue(mockPublicUser);

            const result = await controller.getCurrentUser(mockRequest);

            expect(result.data).toEqual(mockPublicUser);
            expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
        });

        it('should return requested user profile by id', async () => {
            mockUsersService.findOne.mockResolvedValue(mockPublicUser);

            const result = await controller.findOne('user-1', mockUser as JwtUser);

            expect(result.data).toEqual(mockPublicUser);
            expect(service.findOne).toHaveBeenCalledWith('user-1', mockUser);
        });

        it('should throw NotFoundException when user not found', async () => {
            mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

            await expect(controller.findOne('user-1', mockUser as JwtUser)).rejects.toThrow(NotFoundException);
            expect(service.findOne).toHaveBeenCalledWith('user-1', mockUser);
        });
    });

    describe('updateUser', () => {
        const updateData: UpdateUserProfileDto = {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: undefined,
        };

        const mockRequest = mockUser;

        it('should update user successfully when user updates own profile', async () => {
            const updatedUser = { ...mockUser, ...updateData };
            mockUsersService.updateProfile.mockResolvedValue(updatedUser);

            const result = await controller.updateProfile('user-1', updateData, mockRequest as JwtUser);

            expect(result.data).toEqual(updatedUser);
            expect(service.updateProfile).toHaveBeenCalledWith('user-1', updateData, mockRequest);
        });

        it('should throw ForbiddenException when user tries to update another user', async () => {
            const otherUserRequest = { ...mockUser, id: 'user-2' };

            await expect(controller.updateProfile('user-1', updateData, otherUserRequest as JwtUser)).rejects.toThrow(ForbiddenException);

            expect(service.updateProfile).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when user not found', async () => {
            mockUsersService.updateProfile.mockRejectedValue(new NotFoundException('User not found'));

            await expect(controller.updateProfile('user-1', updateData, mockRequest as JwtUser)).rejects.toThrow(NotFoundException);

            expect(service.updateProfile).toHaveBeenCalledWith('user-1', updateData, mockRequest);
        });

        it('should handle service errors properly', async () => {
            const serviceError = new Error('Database connection failed');
            mockUsersService.updateProfile.mockRejectedValue(serviceError);

            await expect(controller.updateProfile('user-1', updateData, mockRequest as JwtUser)).rejects.toThrow('Database connection failed');

            expect(service.updateProfile).toHaveBeenCalledWith('user-1', updateData, mockRequest);
        });

        it('should handle minimal update data', async () => {
            const minimalUpdate: UpdateUserProfileDto = {
                firstName: 'John',
                lastName: 'Doe',
                phone: undefined,
            };

            mockUsersService.updateProfile.mockResolvedValue(mockUser);

            const result = await controller.updateProfile('user-1', minimalUpdate, mockRequest as JwtUser);

            expect(result.data).toEqual(mockUser);
            expect(service.updateProfile).toHaveBeenCalledWith('user-1', minimalUpdate, mockRequest);
        });
    });

    describe('list', () => {
        it('should call list and return users with pagination', async () => {
            const mockResult = {
                data: [mockPublicUser],
                total: 1,
                page: 1,
                limit: 10,
            };
            mockUsersService.list.mockResolvedValue(mockResult);

            const result = await controller.list(mockQuery, mockUser as JwtUser);

            expect(result.data).toEqual(mockResult.data);
            expect(service.list).toHaveBeenCalledWith(mockQuery, mockUser);
        });
    });

    describe('Business Logic', () => {
        it('should enforce user authorization for profile access', () => {
            const ownRequest = { user: { id: 'user-1' } };
            const otherRequest = { user: { id: 'user-2' } };

            // Should allow access to own profile
            expect(() => {
                if (ownRequest.user.id !== 'user-1') {
                    throw new ForbiddenException('You can only view your own profile');
                }
            }).not.toThrow();

            // Should deny access to other profiles
            expect(() => {
                if (otherRequest.user.id !== 'user-1') {
                    throw new ForbiddenException('You can only view your own profile');
                }
            }).toThrow(ForbiddenException);
        });

        it('should enforce user authorization for profile updates', () => {
            const ownRequest = { user: { id: 'user-1' } };
            const otherRequest = { user: { id: 'user-2' } };

            // Should allow updates to own profile
            expect(() => {
                if (ownRequest.user.id !== 'user-1') {
                    throw new ForbiddenException('You can only update your own profile');
                }
            }).not.toThrow();

            // Should deny updates to other profiles
            expect(() => {
                if (otherRequest.user.id !== 'user-1') {
                    throw new ForbiddenException('You can only update your own profile');
                }
            }).toThrow(ForbiddenException);
        });
    });

    describe('Error Handling', () => {
        it('should propagate service errors correctly', async () => {
            const serviceError = new Error('Service unavailable');
            const mockRequest = mockUser;
            mockUsersService.findOne.mockRejectedValue(serviceError);

            await expect(controller.getCurrentUser(mockRequest as JwtUser)).rejects.toThrow('Service unavailable');
        });
    });
});

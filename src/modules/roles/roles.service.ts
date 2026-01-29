import { DrizzleService } from '@/models/model.service';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { and, eq, inArray } from 'drizzle-orm';
import { rolePermissions, roles as roleSchema } from '@/models/schema/roles.schema';
import { RedisService } from '@/app/services/redis/redis.service';
import { permissions } from '@/models/schema';
import { rolePermissions as rolePermissionsSchema } from '@/models/schema/roles.schema';
import { DrizzleTransaction } from '@/models/model.types';
import { RoleInsertInput } from '@/models/zod-schemas';
import { user as userSchema } from '@/models/schema/users.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { FilterQueryDto, PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { BaseFilterableService } from '@/common/services/base-filterable.service';
import { FilterService } from '@/common/services/filter.service';
import { UpdateRoleDetailsDto } from './roles.dto';

@Injectable()
export class RolesService extends BaseFilterableService {
    private db;

    constructor(
        private readonly drizzle: DrizzleService,
        private readonly logger: CustomLoggerService,
        private readonly redisService: RedisService,
        private readonly eventEmitter: EventEmitter2,
        private readonly userService: UsersService,
        filterService: FilterService,
    ) {
        super(filterService);
        this.logger.setContext(RolesService.name);
        this.db = this.drizzle.database;
    }

    async syncAll() {
        // 1️⃣ Fetch all role → permissions in a single query
        const rows = await this.db
            .select({
                roleId: rolePermissions.roleId,
                permName: permissions.name,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

        const permsByRole: Record<string, string[]> = {};
        for (const row of rows) {
            if (!permsByRole[row.roleId]) permsByRole[row.roleId] = [];
            permsByRole[row.roleId].push(row.permName);
        }

        const allRoles = await this.db.query.roles.findMany();

        // 2️⃣ Build pipeline for Redis
        const pipeline = this.redisService.getClient().pipeline();

        let syncedCount = 0;
        for (const role of allRoles) {
            const permList = permsByRole[role.id] || [];
            const existingKeyValue = await this.redisService.get(`perms:${role.id}`);
            if (existingKeyValue !== JSON.stringify(permList)) {
                syncedCount++;
                pipeline.set(`perms:${role.id}`, JSON.stringify(permList));
            }
        }

        await pipeline.exec();

        this.logger.log(`✅ Synced ${syncedCount} roles into Redis`);
    }

    async setPermissionToken(roleId: string, tsx?: DrizzleTransaction) {
        const dbInstance = tsx ?? this.db;

        const perms = await dbInstance
            .select({ permissions: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, roleId));

        const permissionsList = perms.map((p) => p.permissions);

        await this.redisService.set(`perms:${roleId}`, JSON.stringify(permissionsList));

        this.logger.log(`Synced role ${roleId} with ${permissionsList.length} permissions`);

        return permissionsList;
    }

    async getDefault() {
        const role = await this.db.query.roles.findFirst({
            where: eq(roleSchema.isDefault, true),
        });

        if (!role) {
            throw new InternalServerErrorException('Default role cannot be found on DB. ');
        }

        return role;
    }

    async getAdmin() {
        const role = await this.db.query.roles.findFirst({
            where: eq(roleSchema.isAdmin, true),
        });

        if (!role) {
            throw new InternalServerErrorException('Default role cannot be found on DB. ');
        }

        return role;
    }

    async assignToUser(userId: string, roleId: string) {
        const user = await this.db.query.user.findFirst({
            where: eq(userSchema.id, userId),
        });

        if (!user) {
            throw new BadRequestException(`User cannot be found with id: ${userId}`);
        }

        if (user.roleId === roleId) {
            throw new BadRequestException('User already has provided role');
        }

        const [updatedUser] = await this.db.update(userSchema).set({ roleId }).where(eq(userSchema.id, userId)).returning();

        if (!updatedUser) {
            throw new InternalServerErrorException('An error occured while updating user');
        }

        //Event role change event, and auth listener will logout the user. (We cannot directly use AuthService because of circular dependencies.)
        this.eventEmitter.emit('auth.roleChanged', {
            userId: userId,
        });

        return updatedUser;
    }

    async create(role: RoleInsertInput) {
        if (role.isAdmin) {
            throw new BadRequestException('Admin role cannot be created!');
        }

        if (role.isDefault) {
            throw new BadRequestException('Default role cannot be created!');
        }

        const [newRole] = await this.db.insert(roleSchema).values(role).returning();

        if (!newRole) {
            throw new InternalServerErrorException('An error occured while creating role');
        }

        return newRole;
    }

    async lookup() {
        const rolesWithPermissions = await this.db.query.roles.findMany({
            with: {
                rolePermissions: {
                    columns: {},
                    with: {
                        permission: {
                            columns: {
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        return rolesWithPermissions.map((role) => {
            const { rolePermissions, ...rest } = role;
            return {
                ...rest,
                permissions: rolePermissions.map((rp) => rp.permission),
            };
        });
    }

    async list(query: PaginatedFilterQueryDto) {
        const result = await this.filterable(this.db, roleSchema, {
            defaultSortColumn: 'createdAt',
        })
            .filter(query)
            .orderByFromQuery(query, 'createdAt')
            .paginate(query)
            .select();

        return result;
    }

    async findOne(roleId: string) {
        const role = await this.db.query.roles.findFirst({
            where: eq(roleSchema.id, roleId),
        });

        if (!role) {
            throw new NotFoundException(`Role cannot found for id ${roleId}`);
        }

        return role;
    }

    async findOneWithPermissions(roleId: string) {
        const role = await this.db.query.roles.findFirst({
            where: eq(roleSchema.id, roleId),
            with: {
                rolePermissions: {
                    columns: {
                        permissionId: false,
                        roleId: false,
                    },
                    with: {
                        permission: {
                            columns: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException(`Role cannot found for id ${roleId}`);
        }

        const { rolePermissions, ...rest } = role;
        return {
            ...rest,
            permissions: rolePermissions.map((rp) => rp.permission),
        };
    }

    async updateDetails(roleId: string, body: UpdateRoleDetailsDto) {
        const role = await this.findOne(roleId);

        if (role.isAdmin) {
            throw new BadRequestException('Admin role details cannot be changed!');
        }

        if (role.isDefault) {
            throw new BadRequestException('Default role details cannot be changed!');
        }

        const [updated] = await this.db.update(roleSchema).set(body).where(eq(roleSchema.id, roleId)).returning();

        if (!updated) {
            throw new InternalServerErrorException('An error occured while updating role details.');
        }

        return updated;
    }

    async updatePermissions(roleId: string, newPermissionIds: string[], tsx?: DrizzleTransaction) {
        const dbInstance = tsx ?? this.db;

        if (!newPermissionIds.length) {
            throw new BadRequestException('Permission list cannot be empty.');
        }

        const role = await dbInstance.query.roles.findFirst({
            where: eq(roleSchema.id, roleId),
        });

        if (!role) {
            throw new NotFoundException(`Role not found for id: ${roleId}`);
        }

        if (role.isAdmin) {
            throw new BadRequestException('Admin role cannot be updated!');
        }

        const uniqueNewIds = Array.from(new Set(newPermissionIds));
        await dbInstance.transaction(async (tx) => {
            const permissionsDb = await tx.query.permissions.findMany({
                where: inArray(permissions.id, uniqueNewIds),
            });

            if (permissionsDb?.length !== newPermissionIds.length) {
                throw new BadRequestException('Provided permission ids has no corresponding permissions.');
            }

            const existingPermissions = await tx.query.rolePermissions.findMany({
                where: eq(rolePermissionsSchema.roleId, roleId),
                columns: {
                    permissionId: true,
                },
            });

            const existingPermIds = new Set(existingPermissions.map((rp) => rp.permissionId));

            // Delete any perms no longer present
            const toDelete = [...existingPermIds].filter((id) => !uniqueNewIds.includes(id));
            if (toDelete.length) {
                await tx.delete(rolePermissionsSchema).where(and(eq(rolePermissionsSchema.roleId, roleId), inArray(rolePermissionsSchema.permissionId, toDelete)));
            }

            // Insert any missing assignments
            const toInsert = uniqueNewIds.filter((id) => !existingPermIds.has(id)).map((id) => ({ roleId, permissionId: id }));
            if (toInsert.length) {
                await tx.insert(rolePermissionsSchema).values(toInsert);
            }
        });

        await this.setPermissionToken(roleId);
    }
}

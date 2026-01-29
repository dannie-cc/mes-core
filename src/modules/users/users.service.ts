import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, getTableColumns, sql } from 'drizzle-orm';

import { DrizzleService } from '@/models/model.service';
import * as Schema from '@/models/schema';
import { type UserInsertInput, type UserSelectOutput, type PublicUserOutput, type UserUpdateInput, UserSettingsOutput } from '@/models/zod-schemas';
import { type UpdateUserProfileDto } from './users.dto';
import { Pagination } from '@/types';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { BaseFilterableService } from '@/common/services/base-filterable.service';
import { FilterService } from '@/common/services/filter.service';
import { UsersPolicy } from './users.policy';
import { JwtUser } from '@/types/jwt.types';

@Injectable()
export class UsersService extends BaseFilterableService {
    private db;
    private usersPolicy = new UsersPolicy();

    constructor(
        private readonly drizzle: DrizzleService,
        filterService: FilterService,
    ) {
        super(filterService);
        this.db = this.drizzle.database;
    }

    async create(data: UserInsertInput): Promise<UserSelectOutput> {
        try {
            const user = await this.db.transaction(async (tx) => {
                const [createdUser] = await tx
                    .insert(Schema.user)
                    .values({ ...data })
                    .returning();

                await tx.insert(Schema.userSettings).values({
                    userId: createdUser.id,
                    consent: false,
                });

                return createdUser;
            });
            return user;
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error) {
                if (error.code === '23505') {
                    if (error.constraint?.includes('email') || error.detail?.includes('email')) {
                        throw new ConflictException('An account with this email already exists.');
                    }
                    throw new ConflictException('This information is already in use.');
                }
            }

            throw error;
        }
    }

    async list(query: PaginatedFilterQueryDto, user: JwtUser): Promise<{ data: PublicUserOutput[] } & Pagination> {
        const policyWhere = await this.usersPolicy.read(user);

        const result = await this.filterable(this.db, Schema.user, {
            defaultSortColumn: 'createdAt',
        })
            .where(policyWhere)
            .filter(query)
            .join(Schema.roles, eq(Schema.user.roleId, Schema.roles.id), 'inner')
            .orderByFromQuery(query, 'createdAt')
            .paginate(query)
            .selectFields({
                ...getTableColumns(Schema.user),
                role: getTableColumns(Schema.roles),
                factory: getTableColumns(Schema.factory),
            });

        return result;
    }

    async findOne(id: string, reqUser?: JwtUser): Promise<PublicUserOutput> {
        const policyWhere = reqUser ? await this.usersPolicy.read(reqUser, eq(Schema.user.id, id)) : eq(Schema.user.id, id);
        const [user] = await this.db
            .select({
                id: Schema.user.id,
                email: Schema.user.email,
                firstName: Schema.user.firstName,
                lastName: Schema.user.lastName,
                isVerified: Schema.user.isVerified,
                createdAt: Schema.user.createdAt,
                updatedAt: Schema.user.updatedAt,
                roleId: Schema.user.roleId,
                factoryId: Schema.user.factoryId,
                role: Schema.roles,
                factory: Schema.factory,
            })
            .from(Schema.user)
            .innerJoin(Schema.roles, eq(Schema.user.roleId, Schema.roles.id))
            .leftJoin(Schema.factory, eq(Schema.user.factoryId, Schema.factory.id))
            .where(policyWhere)
            .limit(1);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByEmail(email: string): Promise<UserSelectOutput | null> {
        const [user] = await this.db
            .select({
                ...getTableColumns(Schema.user),
                role: Schema.roles,
            })
            .from(Schema.user)
            .innerJoin(Schema.roles, eq(Schema.user.roleId, Schema.roles.id))
            .leftJoin(Schema.factory, eq(Schema.user.factoryId, Schema.factory.id))
            .where(eq(sql`lower(${Schema.user.email})`, email.toLowerCase()))
            .limit(1);
        return user || null;
    }

    async findByVerificationToken(token: string): Promise<UserSelectOutput | null> {
        const [user] = await this.db.select().from(Schema.user).where(eq(Schema.user.verificationToken, token)).limit(1);
        return user || null;
    }

    async verify(userId: string): Promise<void> {
        await this.db.update(Schema.user).set({ isVerified: true, verificationToken: null }).where(eq(Schema.user.id, userId));
    }

    async updateVerificationToken(userId: string, verificationToken: string): Promise<void> {
        await this.db
            .update(Schema.user)
            .set({
                verificationToken,
                updatedAt: new Date(),
            })
            .where(eq(Schema.user.id, userId));
    }

    async updateProfile(id: string, data: UpdateUserProfileDto, reqUser: JwtUser): Promise<PublicUserOutput> {
        const policyWhere = await this.usersPolicy.update(reqUser, eq(Schema.user.id, id));
        try {
            // Check if user exists first
            const existingUser = await this.findOne(id);

            // If email is being updated, check for conflicts
            if (data.email && data.email !== existingUser.email) {
                const userWithEmail = await this.findByEmail(data.email);
                if (userWithEmail) {
                    throw new ConflictException('Unable to update profile. Please check your information.');
                }
            }

            // Update only allowed fields with timestamp
            const updateData = {
                ...data,
                updatedAt: new Date(),
            };

            const [updated] = await this.db.update(Schema.user).set(updateData).where(policyWhere).returning();

            if (!updated) {
                //We are throwing 404 here, mostly because security reasons. This condition will be hitted because of the permissions almost all of the time.
                throw new NotFoundException('No user found to match update criterias');
            }

            const [updatedUser] = await this.db
                .select({
                    id: Schema.user.id,
                    email: Schema.user.email,
                    firstName: Schema.user.firstName,
                    lastName: Schema.user.lastName,
                    isVerified: Schema.user.isVerified,
                    createdAt: Schema.user.createdAt,
                    updatedAt: Schema.user.updatedAt,
                    roleId: Schema.user.roleId,
                    factoryId: Schema.user.factoryId,
                    role: Schema.roles,
                    factory: Schema.factory,
                })
                .from(Schema.user)
                .innerJoin(Schema.roles, eq(Schema.user.roleId, Schema.roles.id))
                .leftJoin(Schema.factory, eq(Schema.user.factoryId, Schema.factory.id))
                .where(eq(Schema.user.id, id));

            return updatedUser;
        } catch (error) {
            // Re-throw known exceptions
            if (error instanceof NotFoundException || error instanceof ConflictException) {
                throw error;
            }

            // Handle database errors
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // Internal method for system operations (auth, verification, etc.)
    async updateInternal(id: string, data: Partial<UserUpdateInput>): Promise<UserSelectOutput> {
        const updateData = {
            ...data,
            updatedAt: new Date(),
        };

        const [user] = await this.db.update(Schema.user).set(updateData).where(eq(Schema.user.id, id)).returning();
        return user;
    }

    async softDelete(id: string): Promise<UserSelectOutput> {
        const [user] = await this.db.update(Schema.user).set({ deletedAt: new Date() }).where(eq(Schema.user.id, id)).returning();
        return user;
    }

    async restore(id: string): Promise<UserSelectOutput> {
        const [user] = await this.db.update(Schema.user).set({ deletedAt: null }).where(eq(Schema.user.id, id)).returning();
        return user;
    }

    async remove(id: string): Promise<UserSelectOutput> {
        const [user] = await this.db.delete(Schema.user).where(eq(Schema.user.id, id)).returning();
        return user;
    }
    async getUserSettings(userId: string): Promise<UserSettingsOutput> {
        const [settings] = await this.db.select().from(Schema.userSettings).where(eq(Schema.userSettings.userId, userId)).limit(1);
        return settings || null;
    }
}

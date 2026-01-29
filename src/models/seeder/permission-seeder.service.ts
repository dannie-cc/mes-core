import { Injectable, OnModuleInit } from '@nestjs/common';
import { DrizzleService } from '../model.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { flattenPermissions } from '@/utils';
import { permissions as permissionSchema } from '@/models/schema/permissions.schema';
import { roles as roleSchema, rolePermissions as rolePermissionsSchema } from '@/models/schema/roles.schema';
import { eq, inArray } from 'drizzle-orm';
import { Permission } from '@/types';
import { PermissionDescriptions, Permissions } from '@/common/permissions';
import { RolesService } from '@/modules/roles/roles.service';

@Injectable()
export class PermissionSeederService implements OnModuleInit {
    private db;
    constructor(
        private readonly drizzle: DrizzleService,
        private readonly logger: CustomLoggerService,
        private readonly rolesService: RolesService,
    ) {
        this.logger.setContext(PermissionSeederService.name);
        this.db = this.drizzle.database;
    }

    async onModuleInit() {
        await this.seedPermissionsAndRoles();
    }

    private async seedPermissionsAndRoles() {
        this.logger.log('🔄 Syncing permissions and roles...');

        const canonicalPermissions = flattenPermissions(Permissions);

        await this.db.transaction(async (tx) => {
            // --- 1. Sync Permissions ---
            const existing = await tx.query.permissions.findMany();
            const existingNames = existing.map((p) => p.name);

            // Insert missing ones
            const missing = canonicalPermissions.filter((p) => !existingNames.includes(p));
            if (missing.length > 0) {
                await tx.insert(permissionSchema).values(missing.map((name) => ({ name, description: PermissionDescriptions?.[name] ?? 'Description not provided.' })));
                this.logger.log(`✅ Inserted ${missing.length} new permissions`);
            }

            // Remove invalid (in DB but not in canonical list)
            const invalid = existingNames.filter((p) => !canonicalPermissions.includes(p as Permission));
            if (invalid.length > 0) {
                await tx.delete(permissionSchema).where(inArray(permissionSchema.name, invalid));
                this.logger.warn(`⚠️ Removed invalid permissions: ${invalid}`);
            }

            // --- 2. Ensure Roles ---
            const ADMIN_ROLE = 'Admin';
            const AUTHENTICATED_ROLE = 'Authenticated';
            const roleNames = [ADMIN_ROLE, AUTHENTICATED_ROLE];
            const existingRoles = await tx.query.roles.findMany();
            const existingRoleNames = existingRoles.map((r) => r.name);

            const rolesToInsert = roleNames.filter((r) => !existingRoleNames.includes(r));

            if (rolesToInsert.length > 0) {
                await tx.insert(roleSchema).values(
                    rolesToInsert.map((name) => {
                        if (name === ADMIN_ROLE) {
                            return {
                                name,
                                description: 'Admin role',
                                isAdmin: true,
                                isDefault: false,
                            };
                        } else if (name === AUTHENTICATED_ROLE) {
                            return {
                                name,
                                description: 'Default role for new users.',
                                isAdmin: false,
                                isDefault: true,
                            };
                        } else {
                            return { name };
                        }
                    }),
                );
                this.logger.log(`✅ Inserted roles: ${rolesToInsert}`);
            }

            // Fetch fresh roles + permissions
            const allRoles = await tx.query.roles.findMany();
            const allPerms = await tx.query.permissions.findMany();

            const adminRole = allRoles.find((r) => r.isAdmin);
            const authenticatedRole = allRoles.find((r) => r.isDefault);

            if (adminRole) {
                // Assign ALL permissions to Admin
                const existingMappings = await tx.query.rolePermissions.findMany({
                    where: eq(rolePermissionsSchema.roleId, adminRole.id),
                });
                const existingPermIds = new Set(existingMappings.map((rp) => rp.permissionId));

                const missingAssignments = allPerms
                    .filter((p) => !existingPermIds.has(p.id))
                    .map((p) => ({
                        roleId: adminRole.id,
                        permissionId: p.id,
                    }));

                if (missingAssignments.length > 0) {
                    await tx.insert(rolePermissionsSchema).values(missingAssignments);
                    this.logger.log(`✅ Added ${missingAssignments.length} missing permissions to Admin`);
                }
            }

            if (authenticatedRole) {
                // Authenticated has NONE by default → ensure no auto-assign
                this.logger.log('ℹ️ Authenticated role ensured (no permissions assigned)');
            }
            this.logger.log(`Permissions in DB now: ${canonicalPermissions.length}`);
            this.logger.log(`Roles in DB: ${allRoles.length}`);
        });
        // --- 3. Sync Redis ---
        await this.rolesService.syncAll();
        this.logger.log('🎯 Permission & Role seeding completed.');
    }
}

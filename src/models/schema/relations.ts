import { relations } from 'drizzle-orm';
import { user } from './users.schema';
import { roles } from './roles.schema';
import { factory } from './factory.schema';
import { product } from './product.schema';
import { bomRevision, bomItem } from './bom.schema';
import { workOrder } from './work-order.schema';
import { rolePermissions } from './roles.schema';
import { permissions } from './permissions.schema';

// Factory Relations
export const factoryRelations = relations(factory, ({ many }) => ({
    products: many(product),
    workOrders: many(workOrder),
    users: many(user),
}));

// Product Relations
export const productRelations = relations(product, ({ one, many }) => ({
    factory: one(factory, {
        fields: [product.factoryId],
        references: [factory.id],
    }),
    revisions: many(bomRevision),
}));

// BOM Relations
export const bomRevisionRelations = relations(bomRevision, ({ one, many }) => ({
    product: one(product, {
        fields: [bomRevision.productId],
        references: [product.id],
    }),
    items: many(bomItem),
    workOrders: many(workOrder),
}));

export const bomItemRelations = relations(bomItem, ({ one }) => ({
    bomRevision: one(bomRevision, {
        fields: [bomItem.bomRevisionId],
        references: [bomRevision.id],
    }),
}));

// Work Order Relations
export const workOrderRelations = relations(workOrder, ({ one }) => ({
    factory: one(factory, {
        fields: [workOrder.factoryId],
        references: [factory.id],
    }),
    bomRevision: one(bomRevision, {
        fields: [workOrder.bomRevisionId],
        references: [bomRevision.id],
    }),
}));

// Identity Relations
export const usersRelations = relations(user, ({ one }) => ({
    role: one(roles, {
        fields: [user.roleId],
        references: [roles.id],
    }),
    factory: one(factory, {
        fields: [user.factoryId],
        references: [factory.id],
    }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
    users: many(user),
    rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
}));

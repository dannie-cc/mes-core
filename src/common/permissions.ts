export const Permissions = {
    orders: {
        Read: 'orders.read',
        ReadAll: 'orders.read.all',
        Write: 'orders.write',
        Update: 'orders.update',
        UpdateAll: 'orders.update.all',
        Delete: 'orders.delete',
        DeleteAll: 'orders.delete.all',
        AssignWorkflow: 'orders.assign_workflow',
        WriteProduct: 'orders.write_product',
        ActivateProduct: 'orders.activate_product',
        CancelProduct: 'orders.cancel_product'
    },
    users: {
        Read: 'users.read',
        ReadAll: 'users.read.all',
        Write: 'users.write',
        Update: 'users.update',
        UpdateAll: 'users.update.all',
        Delete: 'users.delete',
        DeleteAll: 'users.delete.all',
    },
    tickets: {
        Read: 'tickets.read',
        ReadAll: 'tickets.read.all',
        ReadQuotation: 'tickets.read.quotation',
        Update: 'tickets.update',
        UpdateAll: 'tickets.update.all',
        Delete: 'tickets.delete',
        DeleteAll: 'tickets.delete.all',
        UpdateStatus: 'tickets.update_status',
        UpdateStatusAll: 'tickets.update_status.all',
        AddMessage: 'tickets.add_message',
        AddMessageAll: 'tickets.add_message.all',
    },
    roles: {
        Read: 'roles.read',
        Write: 'roles.write',
        Update: 'roles.update',
        Change: 'roles.change',
        ChangePermissions: 'roles.change_permissions',
        Delete: 'roles.delete',
    },
    attachments: {
        Read: 'attachments.read',
        ReadAll: 'attachments.read.all',
        Write: 'attachments.write',
        Update: 'attachments.update',
        UpdateAll: 'attachments.update.all',
        Delete: 'attachments.delete',
        DeleteAll: 'attachments.delete.all',
    },

} as const;

export const PermissionDescriptions: Record<string, string> = {
    // --- Orders ---
    'orders.read': 'Read own orders',
    'orders.read.all': 'Read all orders in the system',
    'orders.write': 'Create new orders',
    'orders.update': 'Update own orders',
    'orders.update.all': 'Update any order in the system',
    'orders.delete': 'Delete own orders',
    'orders.delete.all': 'Delete any order in the system',
    'orders.assign_workflow': 'Assign workflow to an order',
    'orders.write_product': 'Create product revisions',
    'orders.activate_product': 'Activate product revisions',
    'orders.cancel_product': 'Cancel product revisions',


    // --- Order Stages & Files ---
    'order_stages.update': 'Update order stages (e.g., move order between stages)',
    'order_stages.read_files': 'View/download files attached to an order stage',
    'order_stages.upload_files': 'Upload new files to an order stage',
    'order_stages.delete_files': 'Delete files from an order stage',

    // --- Users ---
    'users.read': 'Read own user information',
    'users.read.all': 'Read information of all users',
    'users.write': 'Create new users',
    'users.update': 'Update own user profile',
    'users.update.all': 'Update any user account',
    'users.delete': 'Deactivate/delete own account',
    'users.delete.all': 'Delete or deactivate any user account',

    // --- Tickets ---
    'tickets.read': 'Read own tickets and messages',
    'tickets.read.all': 'Read all tickets and messages in the system, including internal messages',
    'tickets.read.quotation': 'Read all quotation type tickets',
    'tickets.update': 'Update own tickets',
    'tickets.update.all': 'Update any ticket',
    'tickets.delete': 'Delete own tickets',
    'tickets.delete.all': 'Delete any ticket in the system',
    'tickets.update_status': 'Change the status of tickets (e.g., open → closed)',
    'tickets.update_status.all': 'Change the status of all tickets (e.g., open → closed)',
    'tickets.add_message': 'Add message to own tickets',
    'tickets.add_message.all': 'Add message to all tickets, including internal messages',

    // --- Roles & Permissions ---
    'roles.read': 'View roles and their permissions',
    'roles.write': 'Create new roles',
    'roles.update': 'Update existing roles (e.g., rename)',
    'roles.change': 'Change a user’s role',
    'roles.change_permissions': 'Add or remove permissions from a role',
    'roles.delete': 'Delete existing roles',

    // --- Attachments ---
    'attachments.read': 'Read own attachments',
    'attachments.read.all': 'Read all attachments in the system',
    'attachments.write': 'Upload new attachments',
    'attachments.update': 'Update own attachments',
    'attachments.update.all': 'Update any attachment',
    'attachments.delete': 'Delete own attachments',
    'attachments.delete.all': 'Delete any attachment in the system',
};

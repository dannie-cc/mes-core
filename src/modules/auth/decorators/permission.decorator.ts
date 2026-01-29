import { Permission } from '@/types';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequiresPermissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);

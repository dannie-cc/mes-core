export interface JwtUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  factoryId: string;
  permissions: string[];
}

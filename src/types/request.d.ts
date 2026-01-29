import type { SwaggerUI } from './swagger';
import type { JwtUser } from './jwt.types';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      roleId: string;
      permissions: string[];
    }
    interface Request {
      user?: JwtUser;
      rawBody?: string;
    }
  }
  interface Window {
    ui: SwaggerUI;
  }
}

export { };

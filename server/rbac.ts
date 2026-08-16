import type { User, UserRole } from '../src/types.ts';

export interface AuthorizationResult {
  allowed: boolean;
  statusCode: number;
  message?: string;
  user?: User | null;
}

export function authorizeRole(user: User | null, allowedRoles: UserRole[]): AuthorizationResult {
  if (!user) {
    return { allowed: false, statusCode: 401, message: 'Unauthorized' };
  }

  if (user.status === 'suspended') {
    return { allowed: false, statusCode: 403, message: 'Account suspended' };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      statusCode: 403,
      message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`
    };
  }

  return { allowed: true, statusCode: 200, user };
}

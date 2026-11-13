export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
}

// Returned by login, refresh-token and change-password.
// The access token lasts 1 day; the refresh token lasts 7 days and can be used once.
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Roles the given user may assign: super admins any role, admins admin and viewer. */
export function assignableRoles(creator: Role | undefined): Role[] {
  switch (creator) {
    case 'SUPER_ADMIN':
      return ['VIEWER', 'ADMIN', 'SUPER_ADMIN'];
    case 'ADMIN':
      return ['VIEWER', 'ADMIN'];
    default:
      return [];
  }
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: Role;
}

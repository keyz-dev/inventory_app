export type UserRole = 'manager' | 'cashier' | 'viewer';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export type UserPermissions = {
  canSell: boolean;
  canManageProducts: boolean;
  canAdjustStock: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
};

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  manager: {
    canSell: true,
    canManageProducts: true,
    canAdjustStock: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  cashier: {
    canSell: true,
    canManageProducts: false,
    canAdjustStock: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  viewer: {
    canSell: false,
    canManageProducts: false,
    canAdjustStock: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: 'Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  manager: '#3b82f6', // Blue
  cashier: '#10b981', // Green
  viewer: '#6b7280',  // Gray
};

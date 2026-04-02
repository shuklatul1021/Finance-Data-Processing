export const ROLE_NAMES = ["viewer", "analyst", "admin"] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string;
  role: RoleName;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const isRoleName = (value: string): value is RoleName => {
  return ROLE_NAMES.includes(value as RoleName);
};

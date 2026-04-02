import type { RoleName } from "../types/auth.js";

export interface AccessPolicy {
  users: {
    readSelf: boolean;
    manage: boolean;
  };
  roles: {
    read: boolean;
    manage: boolean;
  };
  records: {
    read: boolean;
    manage: boolean;
  };
  dashboard: {
    read: boolean;
    readInsights: boolean;
  };
}

export type AccessResource = keyof AccessPolicy;
export type AccessAction<R extends AccessResource> = keyof AccessPolicy[R];

export const ACCESS_POLICY_BY_ROLE: Record<RoleName, AccessPolicy> = {
  viewer: {
    users: {
      readSelf: true,
      manage: false,
    },
    roles: {
      read: false,
      manage: false,
    },
    records: {
      read: true,
      manage: false,
    },
    dashboard: {
      read: true,
      readInsights: false,
    },
  },
  analyst: {
    users: {
      readSelf: true,
      manage: false,
    },
    roles: {
      read: false,
      manage: false,
    },
    records: {
      read: true,
      manage: false,
    },
    dashboard: {
      read: true,
      readInsights: true,
    },
  },
  admin: {
    users: {
      readSelf: true,
      manage: true,
    },
    roles: {
      read: true,
      manage: true,
    },
    records: {
      read: true,
      manage: true,
    },
    dashboard: {
      read: true,
      readInsights: true,
    },
  },
};

export const canAccess = <R extends AccessResource>(
  role: RoleName,
  resource: R,
  action: AccessAction<R>,
): boolean => {
  return ACCESS_POLICY_BY_ROLE[role][resource][action] === true;
};

export const getRoleAccessPolicy = (role: RoleName): AccessPolicy => {
  return ACCESS_POLICY_BY_ROLE[role];
};

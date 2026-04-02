import type { RoleName } from "../../types/auth.js";
import type { AuthenticatedUser } from "../../types/auth.js";
import { pool } from "../../db/pool.js";

interface DbUserRow {
  id: number;
  full_name: string;
  email: string;
  role_name: RoleName;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

interface DbUserAuthRow extends DbUserRow {
  password_hash: string;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: RoleName;
  passwordHash: string;
  isActive: boolean;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
}

const userSelect = `
  SELECT
    u.id,
    u.full_name,
    u.email,
    r.name AS role_name,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
`;

const toIsoString = (value: string | Date): string => {
  const parsedDate = new Date(value);
  return parsedDate.toISOString();
};

const mapUser = (row: DbUserRow): AuthenticatedUser => {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role_name,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
};

export interface UserWithPassword extends AuthenticatedUser {
  passwordHash: string;
}

const mapUserWithPassword = (row: DbUserAuthRow): UserWithPassword => {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
};

export const listUsers = async (): Promise<AuthenticatedUser[]> => {
  const result = await pool.query<DbUserRow>(
    `
      ${userSelect}
      ORDER BY u.id ASC;
    `,
  );

  return result.rows.map(mapUser);
};

export const findUserById = async (
  userId: number,
): Promise<AuthenticatedUser | null> => {
  const result = await pool.query<DbUserRow>(
    `
      ${userSelect}
      WHERE u.id = $1;
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUser(result.rows[0]);
};

export const findUserByEmailForAuth = async (
  email: string,
): Promise<UserWithPassword | null> => {
  const result = await pool.query<DbUserAuthRow>(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        r.name AS role_name,
        u.password_hash,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1;
    `,
    [email.toLowerCase()],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUserWithPassword(result.rows[0]);
};

export const createUser = async (
  input: CreateUserInput,
): Promise<AuthenticatedUser | null> => {
  const result = await pool.query<DbUserRow>(
    `
      WITH inserted_user AS (
        INSERT INTO users (full_name, email, role_id, password_hash, is_active)
        SELECT $1, $2, r.id, $4, $5
        FROM roles r
        WHERE r.name = $3
        RETURNING id, full_name, email, role_id, is_active, created_at, updated_at
      )
      SELECT
        i.id,
        i.full_name,
        i.email,
        r.name AS role_name,
        i.is_active,
        i.created_at,
        i.updated_at
      FROM inserted_user i
      INNER JOIN roles r ON r.id = i.role_id;
    `,
    [
      input.fullName,
      input.email.toLowerCase(),
      input.role,
      input.passwordHash,
      input.isActive,
    ],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUser(result.rows[0]);
};

export const updateUserProfile = async (
  userId: number,
  input: UpdateUserInput,
): Promise<AuthenticatedUser | null> => {
  const setClauses: string[] = [];
  const parameters: Array<string | number> = [];
  let parameterIndex = 1;

  if (input.fullName !== undefined) {
    setClauses.push(`full_name = $${parameterIndex}`);
    parameters.push(input.fullName);
    parameterIndex += 1;
  }

  if (input.email !== undefined) {
    setClauses.push(`email = $${parameterIndex}`);
    parameters.push(input.email.toLowerCase());
    parameterIndex += 1;
  }

  if (setClauses.length === 0) {
    return findUserById(userId);
  }

  parameters.push(userId);

  const result = await pool.query<DbUserRow>(
    `
      WITH updated_user AS (
        UPDATE users
        SET ${setClauses.join(", ")}, updated_at = NOW()
        WHERE id = $${parameterIndex}
        RETURNING id, full_name, email, role_id, is_active, created_at, updated_at
      )
      SELECT
        u.id,
        u.full_name,
        u.email,
        r.name AS role_name,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM updated_user u
      INNER JOIN roles r ON r.id = u.role_id;
    `,
    parameters,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUser(result.rows[0]);
};

export const updateUserRole = async (
  userId: number,
  role: RoleName,
): Promise<AuthenticatedUser | null> => {
  const result = await pool.query<DbUserRow>(
    `
      WITH selected_role AS (
        SELECT id
        FROM roles
        WHERE name = $2
      ),
      updated_user AS (
        UPDATE users
        SET role_id = (SELECT id FROM selected_role), updated_at = NOW()
        WHERE id = $1 AND EXISTS (SELECT 1 FROM selected_role)
        RETURNING id, full_name, email, role_id, is_active, created_at, updated_at
      )
      SELECT
        u.id,
        u.full_name,
        u.email,
        r.name AS role_name,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM updated_user u
      INNER JOIN roles r ON r.id = u.role_id;
    `,
    [userId, role],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUser(result.rows[0]);
};

export const updateUserStatus = async (
  userId: number,
  isActive: boolean,
): Promise<AuthenticatedUser | null> => {
  const result = await pool.query<DbUserRow>(
    `
      WITH updated_user AS (
        UPDATE users
        SET is_active = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, role_id, is_active, created_at, updated_at
      )
      SELECT
        u.id,
        u.full_name,
        u.email,
        r.name AS role_name,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM updated_user u
      INNER JOIN roles r ON r.id = u.role_id;
    `,
    [userId, isActive],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUser(result.rows[0]);
};

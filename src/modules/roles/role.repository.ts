import type { RoleName } from "../../types/auth.js";
import { pool } from "../../db/pool.js";

interface DbRoleRow {
  id: number;
  name: RoleName;
  description: string;
}

export interface RoleRecord {
  id: number;
  name: RoleName;
  description: string;
}

const mapRole = (row: DbRoleRow): RoleRecord => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
};

export const listRoles = async (): Promise<RoleRecord[]> => {
  const result = await pool.query<DbRoleRow>(
    `
      SELECT id, name, description
      FROM roles
      ORDER BY id ASC;
    `,
  );

  return result.rows.map(mapRole);
};

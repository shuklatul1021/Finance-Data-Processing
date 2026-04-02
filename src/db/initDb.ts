import { hash } from "bcryptjs";

import type { RoleName } from "../types/auth.js";
import { env } from "../config/env.js";
import { pool } from "./pool.js";

/**
 * This Is a simple database initialization script that creates the necessary tables and seeds initial data.
 * It should be run once when setting up the application for the first time.
 * In a production environment, you would typically use a more robust migration tool like Drizzle or Prism with migration scripts to manage database schema changes over time.
 */

interface RoleSeed {
  name: RoleName;
  description: string;
}
// initial role base data to the system in a real application, 
// you might want to manage this through migrations or an admin interface instead of hardcoding it in the initialization script.
const roleSeeds: RoleSeed[] = [
  {
    name: "viewer",
    description: "Can only view dashboard summary data.",
  },
  {
    name: "analyst",
    description: "Can view records and access dashboard insights.",
  },
  {
    name: "admin",
    description: "Can create, update, and manage records and users.",
  },
];

export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    const bootstrapAdminPasswordHash = await hash(
      env.bootstrapAdminPassword,
      12,
    );

    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(32) UNIQUE NOT NULL,
        description TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(180) UNIQUE NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
        record_type VARCHAR(16) NOT NULL CHECK (record_type IN ('income', 'expense')),
        category VARCHAR(80) NOT NULL,
        entry_date DATE NOT NULL,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE financial_records
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_records_entry_date
      ON financial_records (entry_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_records_category
      ON financial_records (category);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_records_record_type
      ON financial_records (record_type);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_records_deleted_at
      ON financial_records (deleted_at);
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);

    await client.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE password_hash IS NULL;
      `,
      [bootstrapAdminPasswordHash],
    );

    await client.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash SET NOT NULL;
    `);

    for (const roleSeed of roleSeeds) {
      await client.query(
        `
          INSERT INTO roles (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name)
          DO UPDATE SET description = EXCLUDED.description;
        `,
        [roleSeed.name, roleSeed.description],
      );
    }

    await client.query(
      `
        INSERT INTO users (full_name, email, role_id, password_hash, is_active)
        SELECT $1, $2, r.id, $3, TRUE
        FROM roles r
        WHERE r.name = 'admin'
        ON CONFLICT (email)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role_id = EXCLUDED.role_id,
          password_hash = EXCLUDED.password_hash,
          is_active = TRUE,
          updated_at = NOW();
      `,
      [
        env.bootstrapAdminName,
        env.bootstrapAdminEmail.toLowerCase(),
        bootstrapAdminPasswordHash,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

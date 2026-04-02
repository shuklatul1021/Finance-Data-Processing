import { pool } from "../../db/pool.js";
import type {
  FinancialRecord,
  PaginationInfo,
  RecordType,
} from "./record.types.js";

interface DbFinancialRecordRow {
  id: number;
  amount: string;
  record_type: RecordType;
  category: string;
  entry_date: string | Date;
  notes: string | null;
  created_by: number;
  deleted_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface DbCountRow {
  total_count: number;
}

export interface CreateFinancialRecordInput {
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes: string | null;
  createdByUserId: number;
}

export interface UpdateFinancialRecordInput {
  amount?: number;
  type?: RecordType;
  category?: string;
  date?: string;
  notes?: string | null;
}

export interface FinancialRecordFilters {
  type?: RecordType;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface RecordListOptions {
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
}

export interface PaginatedFinancialRecords {
  records: FinancialRecord[];
  pagination: PaginationInfo;
}

const toIsoDateString = (value: string | Date): string => {
  return new Date(value).toISOString().slice(0, 10);
};

const toIsoDateTimeString = (value: string | Date): string => {
  return new Date(value).toISOString();
};

const mapFinancialRecord = (row: DbFinancialRecordRow): FinancialRecord => {
  return {
    id: row.id,
    amount: Number(row.amount),
    type: row.record_type,
    category: row.category,
    date: toIsoDateString(row.entry_date),
    notes: row.notes,
    createdByUserId: row.created_by,
    deletedAt: row.deleted_at ? toIsoDateTimeString(row.deleted_at) : null,
    createdAt: toIsoDateTimeString(row.created_at),
    updatedAt: toIsoDateTimeString(row.updated_at),
  };
};

const buildWhereClause = (
  filters: FinancialRecordFilters,
  includeDeleted: boolean,
): { whereSql: string; values: Array<string | number> } => {
  const whereClauses: string[] = [];
  const values: Array<string | number> = [];

  const addFilter = (clause: string, value: string | number): void => {
    values.push(value);
    whereClauses.push(`${clause} $${values.length}`);
  };

  if (!includeDeleted) {
    whereClauses.push("deleted_at IS NULL");
  }

  if (filters.type !== undefined) {
    addFilter("record_type =", filters.type);
  }

  if (filters.category !== undefined) {
    addFilter("category ILIKE", `%${filters.category}%`);
  }

  if (filters.search !== undefined) {
    values.push(`%${filters.search}%`);
    const param = `$${values.length}`;
    whereClauses.push(
      `(category ILIKE ${param} OR COALESCE(notes, '') ILIKE ${param} OR record_type ILIKE ${param})`,
    );
  }

  if (filters.startDate !== undefined) {
    addFilter("entry_date >=", filters.startDate);
  }

  if (filters.endDate !== undefined) {
    addFilter("entry_date <=", filters.endDate);
  }

  if (filters.minAmount !== undefined) {
    addFilter("amount >=", filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    addFilter("amount <=", filters.maxAmount);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  return { whereSql, values };
};

export const createFinancialRecord = async (
  input: CreateFinancialRecordInput,
): Promise<FinancialRecord> => {
  const result = await pool.query<DbFinancialRecordRow>(
    `
      INSERT INTO financial_records (
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by,
        deleted_at,
        created_at,
        updated_at;
    `,
    [
      input.amount,
      input.type,
      input.category,
      input.date,
      input.notes,
      input.createdByUserId,
    ],
  );

  return mapFinancialRecord(result.rows[0]);
};

export const listFinancialRecords = async (
  filters: FinancialRecordFilters,
  options: RecordListOptions,
): Promise<PaginatedFinancialRecords> => {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const includeDeleted = options.includeDeleted ?? false;
  const offset = (page - 1) * pageSize;

  const { whereSql, values } = buildWhereClause(filters, includeDeleted);

  const countResult = await pool.query<DbCountRow>(
    `
      SELECT COUNT(*)::int AS total_count
      FROM financial_records
      ${whereSql};
    `,
    values,
  );

  const totalItems = countResult.rows[0]?.total_count ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  const queryValues = [...values, pageSize, offset];

  const result = await pool.query<DbFinancialRecordRow>(
    `
      SELECT
        id,
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by,
        deleted_at,
        created_at,
        updated_at
      FROM financial_records
      ${whereSql}
      ORDER BY entry_date DESC, id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2};
    `,
    queryValues,
  );

  const records = result.rows.map(mapFinancialRecord);

  return {
    records,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: totalPages > 0 && page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    },
  };
};

export const findFinancialRecordById = async (
  recordId: number,
  includeDeleted = false,
): Promise<FinancialRecord | null> => {
  const whereDeleted = includeDeleted ? "" : "AND deleted_at IS NULL";

  const result = await pool.query<DbFinancialRecordRow>(
    `
      SELECT
        id,
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by,
        deleted_at,
        created_at,
        updated_at
      FROM financial_records
      WHERE id = $1
      ${whereDeleted};
    `,
    [recordId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapFinancialRecord(result.rows[0]);
};

export const updateFinancialRecord = async (
  recordId: number,
  input: UpdateFinancialRecordInput,
): Promise<FinancialRecord | null> => {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  const addSetClause = (
    columnName: string,
    value: string | number | null,
  ): void => {
    values.push(value);
    setClauses.push(`${columnName} = $${values.length}`);
  };

  if (input.amount !== undefined) {
    addSetClause("amount", input.amount);
  }

  if (input.type !== undefined) {
    addSetClause("record_type", input.type);
  }

  if (input.category !== undefined) {
    addSetClause("category", input.category);
  }

  if (input.date !== undefined) {
    addSetClause("entry_date", input.date);
  }

  if (input.notes !== undefined) {
    addSetClause("notes", input.notes);
  }

  if (setClauses.length === 0) {
    return findFinancialRecordById(recordId);
  }

  values.push(recordId);

  const result = await pool.query<DbFinancialRecordRow>(
    `
      UPDATE financial_records
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
        AND deleted_at IS NULL
      RETURNING
        id,
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by,
        deleted_at,
        created_at,
        updated_at;
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapFinancialRecord(result.rows[0]);
};

export const deleteFinancialRecord = async (
  recordId: number,
): Promise<boolean> => {
  const result = await pool.query<{ id: number }>(
    `
      UPDATE financial_records
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id;
    `,
    [recordId],
  );

  return result.rowCount !== 0;
};

import { pool } from "../../db/pool.js";
import type { RecordType } from "../records/record.types.js";

interface FinancialOverviewRow {
  total_income: string;
  total_expenses: string;
  total_records: number;
}

interface CategoryTotalsRow {
  category: string;
  income_total: string;
  expense_total: string;
  total_amount: string;
  record_count: number;
}

interface RecentActivityRow {
  id: number;
  amount: string;
  record_type: RecordType;
  category: string;
  entry_date: string | Date;
  notes: string | null;
  created_by: number;
  created_at: string | Date;
}

interface TrendRow {
  bucket_start: string | Date;
  income_total: string;
  expense_total: string;
}

export const TREND_GROUP_BY_VALUES = ["monthly", "weekly"] as const;

export type TrendGroupBy = (typeof TREND_GROUP_BY_VALUES)[number];

export interface DashboardOverview {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalRecords: number;
}

export interface DashboardCategoryTotal {
  category: string;
  incomeTotal: number;
  expenseTotal: number;
  netBalance: number;
  totalAmount: number;
  recordCount: number;
}

export interface DashboardRecentActivityItem {
  id: number;
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes: string | null;
  createdByUserId: number;
  createdAt: string;
}

export interface DashboardTrendPoint {
  periodStart: string;
  incomeTotal: number;
  expenseTotal: number;
  netBalance: number;
}

export interface DashboardSummary {
  generatedAt: string;
  overview: DashboardOverview;
  categoryTotals: DashboardCategoryTotal[];
  recentActivity: DashboardRecentActivityItem[];
  monthlyTrend: DashboardTrendPoint[];
  weeklyTrend: DashboardTrendPoint[];
}

export interface DashboardInsights {
  generatedAt: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  avgRecordAmount: number;
  incomeExpenseRatio: number | null;
  topIncomeCategory: string | null;
  topExpenseCategory: string | null;
}

export interface CategoryTotalsOptions {
  type?: RecordType;
  limit?: number;
}

export interface TrendOptions {
  groupBy: TrendGroupBy;
  periods: number;
}

const toMoney = (value: string): number => {
  return Number(Number(value).toFixed(2));
};

const toIsoDateString = (value: string | Date): string => {
  return new Date(value).toISOString().slice(0, 10);
};

const toIsoDateTimeString = (value: string | Date): string => {
  return new Date(value).toISOString();
};

const mapOverview = (row: FinancialOverviewRow): DashboardOverview => {
  const totalIncome = toMoney(row.total_income);
  const totalExpenses = toMoney(row.total_expenses);

  return {
    totalIncome,
    totalExpenses,
    netBalance: toMoney(String(totalIncome - totalExpenses)),
    totalRecords: row.total_records,
  };
};

const mapCategoryTotals = (row: CategoryTotalsRow): DashboardCategoryTotal => {
  const incomeTotal = toMoney(row.income_total);
  const expenseTotal = toMoney(row.expense_total);
  const totalAmount = toMoney(row.total_amount);

  return {
    category: row.category,
    incomeTotal,
    expenseTotal,
    netBalance: toMoney(String(incomeTotal - expenseTotal)),
    totalAmount,
    recordCount: row.record_count,
  };
};

const mapRecentActivity = (
  row: RecentActivityRow,
): DashboardRecentActivityItem => {
  return {
    id: row.id,
    amount: toMoney(row.amount),
    type: row.record_type,
    category: row.category,
    date: toIsoDateString(row.entry_date),
    notes: row.notes,
    createdByUserId: row.created_by,
    createdAt: toIsoDateTimeString(row.created_at),
  };
};

const mapTrendPoint = (row: TrendRow): DashboardTrendPoint => {
  const incomeTotal = toMoney(row.income_total);
  const expenseTotal = toMoney(row.expense_total);

  return {
    periodStart: toIsoDateString(row.bucket_start),
    incomeTotal,
    expenseTotal,
    netBalance: toMoney(String(incomeTotal - expenseTotal)),
  };
};

export const isTrendGroupBy = (value: string): value is TrendGroupBy => {
  return TREND_GROUP_BY_VALUES.includes(value as TrendGroupBy);
};

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const result = await pool.query<FinancialOverviewRow>(
    `
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'income'), 0)::numeric(14, 2) AS total_income,
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'expense'), 0)::numeric(14, 2) AS total_expenses,
        COUNT(*)::int AS total_records
      FROM financial_records
      WHERE deleted_at IS NULL;
    `,
  );

  return mapOverview(result.rows[0]);
};

export const getCategoryTotals = async (
  options: CategoryTotalsOptions = {},
): Promise<DashboardCategoryTotal[]> => {
  const whereClauses: string[] = ["deleted_at IS NULL"];
  const values: Array<string | number> = [];

  if (options.type !== undefined) {
    values.push(options.type);
    whereClauses.push(`record_type = $${values.length}`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const limit = options.limit ?? 10;
  values.push(limit);

  const result = await pool.query<CategoryTotalsRow>(
    `
      SELECT
        category,
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'income'), 0)::numeric(14, 2) AS income_total,
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'expense'), 0)::numeric(14, 2) AS expense_total,
        COALESCE(SUM(amount), 0)::numeric(14, 2) AS total_amount,
        COUNT(*)::int AS record_count
      FROM financial_records
      ${whereSql}
      GROUP BY category
      ORDER BY total_amount DESC, category ASC
      LIMIT $${values.length};
    `,
    values,
  );

  return result.rows.map(mapCategoryTotals);
};

export const getRecentActivity = async (
  limit = 10,
): Promise<DashboardRecentActivityItem[]> => {
  const result = await pool.query<RecentActivityRow>(
    `
      SELECT
        id,
        amount,
        record_type,
        category,
        entry_date,
        notes,
        created_by,
        created_at
      FROM financial_records
      WHERE deleted_at IS NULL
      ORDER BY entry_date DESC, id DESC
      LIMIT $1;
    `,
    [limit],
  );

  return result.rows.map(mapRecentActivity);
};

export const getDashboardTrend = async (
  options: TrendOptions,
): Promise<DashboardTrendPoint[]> => {
  const bucketUnit = options.groupBy === "weekly" ? "week" : "month";
  const intervalStep = options.groupBy === "weekly" ? "1 week" : "1 month";

  const result = await pool.query<TrendRow>(
    `
      WITH current_bucket AS (
        SELECT DATE_TRUNC('${bucketUnit}', CURRENT_DATE::timestamp)::date AS current_bucket_start
      ),
      series AS (
        SELECT generate_series(
          (SELECT current_bucket_start - ($1 - 1) * INTERVAL '${intervalStep}' FROM current_bucket),
          (SELECT current_bucket_start FROM current_bucket),
          INTERVAL '${intervalStep}'
        )::date AS bucket_start
      ),
      aggregated AS (
        SELECT
          DATE_TRUNC('${bucketUnit}', entry_date::timestamp)::date AS bucket_start,
          COALESCE(SUM(amount) FILTER (WHERE record_type = 'income'), 0)::numeric(14, 2) AS income_total,
          COALESCE(SUM(amount) FILTER (WHERE record_type = 'expense'), 0)::numeric(14, 2) AS expense_total
        FROM financial_records
        WHERE entry_date >= (SELECT MIN(bucket_start) FROM series)
          AND entry_date < ((SELECT MAX(bucket_start) FROM series) + INTERVAL '${intervalStep}')
          AND deleted_at IS NULL
        GROUP BY 1
      )
      SELECT
        s.bucket_start,
        COALESCE(a.income_total, 0)::numeric(14, 2) AS income_total,
        COALESCE(a.expense_total, 0)::numeric(14, 2) AS expense_total
      FROM series s
      LEFT JOIN aggregated a ON a.bucket_start = s.bucket_start
      ORDER BY s.bucket_start ASC;
    `,
    [options.periods],
  );

  return result.rows.map(mapTrendPoint);
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [overview, categoryTotals, recentActivity, monthlyTrend, weeklyTrend] =
    await Promise.all([
      getDashboardOverview(),
      getCategoryTotals({ limit: 6 }),
      getRecentActivity(8),
      getDashboardTrend({ groupBy: "monthly", periods: 6 }),
      getDashboardTrend({ groupBy: "weekly", periods: 8 }),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    overview,
    categoryTotals,
    recentActivity,
    monthlyTrend,
    weeklyTrend,
  };
};

export const getDashboardInsights = async (): Promise<DashboardInsights> => {
  const [overview, categoryTotals] = await Promise.all([
    getDashboardOverview(),
    getCategoryTotals({ limit: 100 }),
  ]);

  const topIncomeCategory =
    categoryTotals.slice().sort((a, b) => b.incomeTotal - a.incomeTotal)[0]
      ?.category ?? null;

  const topExpenseCategory =
    categoryTotals.slice().sort((a, b) => b.expenseTotal - a.expenseTotal)[0]
      ?.category ?? null;

  const avgRecordAmount =
    overview.totalRecords === 0
      ? 0
      : toMoney(
          String(
            (overview.totalIncome + overview.totalExpenses) /
              overview.totalRecords,
          ),
        );

  const incomeExpenseRatio =
    overview.totalExpenses === 0
      ? null
      : Number((overview.totalIncome / overview.totalExpenses).toFixed(4));

  return {
    generatedAt: new Date().toISOString(),
    totalIncome: overview.totalIncome,
    totalExpenses: overview.totalExpenses,
    netBalance: overview.netBalance,
    avgRecordAmount,
    incomeExpenseRatio,
    topIncomeCategory,
    topExpenseCategory,
  };
};

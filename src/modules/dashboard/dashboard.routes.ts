import { Router } from "express";

import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../lib/httpError.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeAccess } from "../../middleware/authorize.js";
import {
  getCategoryTotals,
  getDashboardInsights,
  getDashboardSummary,
  getDashboardTrend,
  getRecentActivity,
  isTrendGroupBy,
} from "./dashboard.repository.js";
import { isRecordType } from "../records/record.types.js";

const dashboardRouter = Router();

const parseQueryString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} cannot be provided multiple times.`);
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const parsePositiveInteger = (
  value: unknown,
  fieldName: string,
  defaultValue: number,
  maxValue: number,
): number => {
  const queryValue = parseQueryString(value, fieldName);

  if (queryValue === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(queryValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  if (parsedValue > maxValue) {
    throw new HttpError(
      400,
      `${fieldName} cannot be greater than ${maxValue}.`,
    );
  }

  return parsedValue;
};

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/summary",
  authorizeAccess("dashboard", "read"),
  asyncHandler(async (_req, res) => {
    const summary = await getDashboardSummary();
    res.json({ data: summary });
  }),
);

dashboardRouter.get(
  "/category-totals",
  authorizeAccess("dashboard", "read"),
  asyncHandler(async (req, res) => {
    const typeQuery = parseQueryString(req.query.type, "type");
    const limit = parsePositiveInteger(req.query.limit, "limit", 10, 100);

    const type =
      typeQuery === undefined
        ? undefined
        : (() => {
            const normalizedType = typeQuery.toLowerCase();

            if (!isRecordType(normalizedType)) {
              throw new HttpError(400, "type must be one of: income, expense.");
            }

            return normalizedType;
          })();

    const categoryTotals = await getCategoryTotals({ type, limit });

    res.json({
      data: categoryTotals,
      filters: {
        type,
        limit,
      },
    });
  }),
);

dashboardRouter.get(
  "/recent-activity",
  authorizeAccess("dashboard", "read"),
  asyncHandler(async (req, res) => {
    const limit = parsePositiveInteger(req.query.limit, "limit", 10, 100);
    const activity = await getRecentActivity(limit);

    res.json({
      data: activity,
      filters: {
        limit,
      },
    });
  }),
);

dashboardRouter.get(
  "/trends",
  authorizeAccess("dashboard", "read"),
  asyncHandler(async (req, res) => {
    const groupByQuery = parseQueryString(req.query.groupBy, "groupBy");
    const normalizedGroupBy = (groupByQuery ?? "monthly").toLowerCase();

    if (!isTrendGroupBy(normalizedGroupBy)) {
      throw new HttpError(400, "groupBy must be one of: monthly, weekly.");
    }

    const defaultPeriods = normalizedGroupBy === "weekly" ? 8 : 6;
    const maxPeriods = normalizedGroupBy === "weekly" ? 52 : 24;
    const periods = parsePositiveInteger(
      req.query.periods,
      "periods",
      defaultPeriods,
      maxPeriods,
    );

    const trend = await getDashboardTrend({
      groupBy: normalizedGroupBy,
      periods,
    });

    res.json({
      data: trend,
      filters: {
        groupBy: normalizedGroupBy,
        periods,
      },
    });
  }),
);

dashboardRouter.get(
  "/insights",
  authorizeAccess("dashboard", "readInsights"),
  asyncHandler(async (_req, res) => {
    const insights = await getDashboardInsights();
    res.json({ data: insights });
  }),
);

export { dashboardRouter };

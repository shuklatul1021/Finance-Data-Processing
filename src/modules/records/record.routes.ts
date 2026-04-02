import { Router } from "express";

import { canAccess } from "../../access-control/policy.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../lib/httpError.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeAccess } from "../../middleware/authorize.js";
import {
  createFinancialRecord,
  deleteFinancialRecord,
  findFinancialRecordById,
  listFinancialRecords,
  updateFinancialRecord,
  type FinancialRecordFilters,
} from "./record.repository.js";
import { isRecordType, type RecordType } from "./record.types.js";

const recordRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const parsePositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsedValue;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  return trimmedValue;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseRequiredString(value, fieldName);
};

const parseAmount = (value: unknown, fieldName: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new HttpError(400, `${fieldName} must be a valid number.`);
  }

  if (value < 0) {
    throw new HttpError(400, `${fieldName} must be zero or greater.`);
  }

  return Number(value.toFixed(2));
};

const parseOptionalAmount = (
  value: unknown,
  fieldName: string,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseAmount(value, fieldName);
};

const isValidDate = (value: string): boolean => {
  if (!dateRegex.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
};

const parseDate = (value: unknown, fieldName: string): string => {
  const date = parseRequiredString(value, fieldName);

  if (!isValidDate(date)) {
    throw new HttpError(400, `${fieldName} must be in YYYY-MM-DD format.`);
  }

  return date;
};

const parseOptionalDate = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseDate(value, fieldName);
};

const parseType = (value: unknown, fieldName: string): RecordType => {
  const candidate = parseRequiredString(value, fieldName).toLowerCase();

  if (!isRecordType(candidate)) {
    throw new HttpError(400, `${fieldName} must be one of: income, expense.`);
  }

  return candidate;
};

const parseOptionalType = (
  value: unknown,
  fieldName: string,
): RecordType | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseType(value, fieldName);
};

const parseNotes = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return parseRequiredString(value, "notes");
};

const parseOptionalNotes = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseNotes(value);
};

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

const parseQueryNumber = (
  value: unknown,
  fieldName: string,
): number | undefined => {
  const queryValue = parseQueryString(value, fieldName);

  if (queryValue === undefined) {
    return undefined;
  }

  const parsedNumber = Number(queryValue);

  if (Number.isNaN(parsedNumber)) {
    throw new HttpError(400, `${fieldName} must be a valid number.`);
  }

  if (parsedNumber < 0) {
    throw new HttpError(400, `${fieldName} must be zero or greater.`);
  }

  return Number(parsedNumber.toFixed(2));
};

const parseQueryPositiveInteger = (
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

const parseQueryBoolean = (
  value: unknown,
  fieldName: string,
  defaultValue: boolean,
): boolean => {
  const queryValue = parseQueryString(value, fieldName);

  if (queryValue === undefined) {
    return defaultValue;
  }

  const normalized = queryValue.toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new HttpError(400, `${fieldName} must be true or false.`);
};

recordRouter.use(authenticate);

recordRouter.post(
  "/",
  authorizeAccess("records", "manage"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required.");
    }

    const amount = parseAmount(req.body.amount, "amount");
    const type = parseType(req.body.type, "type");
    const category = parseRequiredString(req.body.category, "category");
    const date = parseDate(req.body.date, "date");
    const notes = parseNotes(req.body.notes);

    const createdRecord = await createFinancialRecord({
      amount,
      type,
      category,
      date,
      notes,
      createdByUserId: req.user.id,
    });

    res.status(201).json({ data: createdRecord });
  }),
);

recordRouter.get(
  "/",
  authorizeAccess("records", "read"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required.");
    }

    const typeQuery = parseQueryString(req.query.type, "type");
    const category = parseQueryString(req.query.category, "category");
    const search = parseQueryString(req.query.search, "search");
    const startDateQuery = parseQueryString(req.query.startDate, "startDate");
    const endDateQuery = parseQueryString(req.query.endDate, "endDate");
    const minAmount = parseQueryNumber(req.query.minAmount, "minAmount");
    const maxAmount = parseQueryNumber(req.query.maxAmount, "maxAmount");
    const page = parseQueryPositiveInteger(req.query.page, "page", 1, 100000);
    const pageSize = parseQueryPositiveInteger(
      req.query.pageSize,
      "pageSize",
      10,
      100,
    );
    const includeDeleted = parseQueryBoolean(
      req.query.includeDeleted,
      "includeDeleted",
      false,
    );

    if (includeDeleted && !canAccess(req.user.role, "records", "manage")) {
      throw new HttpError(
        403,
        "Only admin users can include soft-deleted records.",
      );
    }

    const type =
      typeQuery === undefined ? undefined : parseType(typeQuery, "type");
    const startDate =
      startDateQuery === undefined
        ? undefined
        : parseDate(startDateQuery, "startDate");
    const endDate =
      endDateQuery === undefined
        ? undefined
        : parseDate(endDateQuery, "endDate");

    if (
      minAmount !== undefined &&
      maxAmount !== undefined &&
      minAmount > maxAmount
    ) {
      throw new HttpError(400, "minAmount cannot be greater than maxAmount.");
    }

    if (
      startDate !== undefined &&
      endDate !== undefined &&
      startDate > endDate
    ) {
      throw new HttpError(400, "startDate cannot be later than endDate.");
    }

    const filters: FinancialRecordFilters = {
      type,
      category,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    };

    const recordsResult = await listFinancialRecords(filters, {
      page,
      pageSize,
      includeDeleted,
    });

    res.json({
      data: recordsResult.records,
      pagination: recordsResult.pagination,
      filters: {
        ...filters,
        includeDeleted,
      },
    });
  }),
);

recordRouter.get(
  "/:id",
  authorizeAccess("records", "read"),
  asyncHandler(async (req, res) => {
    const recordId = parsePositiveInteger(req.params.id, "id");
    const record = await findFinancialRecordById(recordId);

    if (!record) {
      throw new HttpError(404, "Financial record not found.");
    }

    res.json({ data: record });
  }),
);

recordRouter.patch(
  "/:id",
  authorizeAccess("records", "manage"),
  asyncHandler(async (req, res) => {
    const recordId = parsePositiveInteger(req.params.id, "id");

    const amount = parseOptionalAmount(req.body.amount, "amount");
    const type = parseOptionalType(req.body.type, "type");
    const category = parseOptionalString(req.body.category, "category");
    const date = parseOptionalDate(req.body.date, "date");
    const notes = parseOptionalNotes(req.body.notes);

    if (
      amount === undefined &&
      type === undefined &&
      category === undefined &&
      date === undefined &&
      notes === undefined
    ) {
      throw new HttpError(
        400,
        "At least one field must be provided: amount, type, category, date, notes.",
      );
    }

    const updatedRecord = await updateFinancialRecord(recordId, {
      amount,
      type,
      category,
      date,
      notes,
    });

    if (!updatedRecord) {
      throw new HttpError(404, "Financial record not found.");
    }

    res.json({ data: updatedRecord });
  }),
);

recordRouter.delete(
  "/:id",
  authorizeAccess("records", "manage"),
  asyncHandler(async (req, res) => {
    const recordId = parsePositiveInteger(req.params.id, "id");
    const deleted = await deleteFinancialRecord(recordId);

    if (!deleted) {
      throw new HttpError(404, "Financial record not found.");
    }

    res.status(204).send();
  }),
);

export { recordRouter };

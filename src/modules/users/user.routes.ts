import { Router } from "express";
import { hash } from "bcryptjs";

import type { RoleName } from "../../types/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../lib/httpError.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeAccess } from "../../middleware/authorize.js";
import { isRoleName } from "../../types/auth.js";
import {
  createUser,
  findUserById,
  listUsers,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
} from "./user.repository.js";

const userRouter = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const parseEmail = (value: unknown): string => {
  const email = parseRequiredString(value, "email").toLowerCase();

  if (!emailRegex.test(email)) {
    throw new HttpError(400, "email must be a valid email address.");
  }

  return email;
};

const parseOptionalEmail = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return parseEmail(value);
};

const parseRole = (value: unknown): RoleName => {
  const roleCandidate = parseRequiredString(value, "role").toLowerCase();

  if (!isRoleName(roleCandidate)) {
    throw new HttpError(400, "role must be one of: viewer, analyst, admin.");
  }

  return roleCandidate;
};

const parseBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${fieldName} must be a boolean.`);
  }

  return value;
};

const parsePassword = (value: unknown): string => {
  const password = parseRequiredString(value, "password");

  if (password.length < 8) {
    throw new HttpError(400, "password must be at least 8 characters long.");
  }

  return password;
};

const parseOptionalBoolean = (
  value: unknown,
  fieldName: string,
  fallback: boolean,
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return parseBoolean(value, fieldName);
};

userRouter.use(authenticate);

userRouter.get(
  "/me",
  authorizeAccess("users", "readSelf"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required.");
    }

    res.json({ data: req.user });
  }),
);

userRouter.get(
  "/",
  authorizeAccess("users", "manage"),
  asyncHandler(async (_req, res) => {
    const users = await listUsers();
    res.json({ data: users });
  }),
);

userRouter.get(
  "/:id",
  authorizeAccess("users", "manage"),
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInteger(req.params.id, "id");
    const user = await findUserById(userId);

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    res.json({ data: user });
  }),
);

userRouter.post(
  "/",
  authorizeAccess("users", "manage"),
  asyncHandler(async (req, res) => {
    const fullName = parseRequiredString(req.body.fullName, "fullName");
    const email = parseEmail(req.body.email);
    const password = parsePassword(req.body.password);
    const role = parseRole(req.body.role);
    const isActive = parseOptionalBoolean(req.body.isActive, "isActive", true);
    const passwordHash = await hash(password, 12);

    const createdUser = await createUser({
      fullName,
      email,
      passwordHash,
      role,
      isActive,
    });

    if (!createdUser) {
      throw new HttpError(400, "Unable to create user with the provided role.");
    }

    res.status(201).json({ data: createdUser });
  }),
);

userRouter.patch(
  "/:id",
  authorizeAccess("users", "manage"),
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInteger(req.params.id, "id");
    const fullName = parseOptionalString(req.body.fullName, "fullName");
    const email = parseOptionalEmail(req.body.email);

    if (fullName === undefined && email === undefined) {
      throw new HttpError(
        400,
        "At least one field must be provided: fullName or email.",
      );
    }

    const updatedUser = await updateUserProfile(userId, {
      fullName,
      email,
    });

    if (!updatedUser) {
      throw new HttpError(404, "User not found.");
    }

    res.json({ data: updatedUser });
  }),
);

userRouter.patch(
  "/:id/role",
  authorizeAccess("users", "manage"),
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInteger(req.params.id, "id");
    const role = parseRole(req.body.role);

    const updatedUser = await updateUserRole(userId, role);

    if (!updatedUser) {
      throw new HttpError(404, "User not found.");
    }

    res.json({ data: updatedUser });
  }),
);

userRouter.patch(
  "/:id/status",
  authorizeAccess("users", "manage"),
  asyncHandler(async (req, res) => {
    const userId = parsePositiveInteger(req.params.id, "id");
    const isActive = parseBoolean(req.body.isActive, "isActive");

    const updatedUser = await updateUserStatus(userId, isActive);

    if (!updatedUser) {
      throw new HttpError(404, "User not found.");
    }

    res.json({ data: updatedUser });
  }),
);

export { userRouter };

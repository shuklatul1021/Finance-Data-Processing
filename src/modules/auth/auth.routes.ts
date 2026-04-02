import { compare } from "bcryptjs";
import { Router } from "express";

import { env } from "../../config/env.js";
import { getRoleAccessPolicy } from "../../access-control/policy.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../lib/httpError.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeAccess } from "../../middleware/authorize.js";
import { findUserByEmailForAuth } from "../users/user.repository.js";
import { issueAccessToken } from "./auth.token.js";

const authRouter = Router();
//Using Regex to validate email format, but we can also use zod
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper fucntion for validation
const parseRequiredString =(value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new HttpError(400,`${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new HttpError(400,`${fieldName} is required.`);
  }
  return trimmedValue;
};

const parseEmail = (value: unknown): string => {
  const email =parseRequiredString(value, "email").toLowerCase();

  if (!emailRegex.test(email)) {
    throw new HttpError(400, "email must be a valid email address.");
  }

  return email;
};

const parsePassword = (value: unknown): string => {
  return parseRequiredString(value, "password");
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = parseEmail(req.body.email);
    const password = parsePassword(req.body.password);

    const user = await findUserByEmailForAuth(email);

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email or password.");
    }

    if (!user.isActive) {
      throw new HttpError(403, "User account is inactive.");
    }

    const accessToken = issueAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      data: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: env.jwtExpiresIn,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        permissions: getRoleAccessPolicy(user.role),
      },
    });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  authorizeAccess("users", "readSelf"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required.");
    }

    res.json({
      data: req.user,
      permissions: getRoleAccessPolicy(req.user.role),
    });
  }),
);

authRouter.get(
  "/permissions",
  authenticate,
  authorizeAccess("users", "readSelf"),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required.");
    }

    res.json({
      data: {
        role: req.user.role,
        permissions: getRoleAccessPolicy(req.user.role),
      },
    });
  }),
);

export { authRouter };

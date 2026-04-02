import type { RequestHandler } from "express";

import {
  canAccess,
  type AccessAction,
  type AccessResource,
} from "../access-control/policy.js";
import type { RoleName } from "../types/auth.js";
import { HttpError } from "../lib/httpError.js";

export const authorizeRoles = (...allowedRoles: RoleName[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication is required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new HttpError(403, "Insufficient permissions for this action."),
      );
    }

    return next();
  };
};

export const authorizeAccess = <R extends AccessResource>(
  resource: R,
  action: AccessAction<R>,
): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication is required."));
    }

    if (!canAccess(req.user.role, resource, action)) {
      return next(
        new HttpError(
          403,
          `Role ${req.user.role} is not allowed to ${String(action)} on ${resource}.`,
        ),
      );
    }

    return next();
  };
};

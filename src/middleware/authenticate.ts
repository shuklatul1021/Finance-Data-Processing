import type { RequestHandler } from "express";

import { HttpError } from "../lib/httpError.js";
import { verifyAccessToken } from "../modules/auth/auth.token.js";
import { findUserById } from "../modules/users/user.repository.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const authorization = req.header("authorization");

    if (!authorization) {
      throw new HttpError(401, "Missing Authorization header.");
    }

    const [scheme, token] = authorization.split(" ");

    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
      throw new HttpError(401, "Authorization header must be: Bearer <token>.");
    }

    const payload = verifyAccessToken(token);

    const user = await findUserById(payload.userId);

    if (!user) {
      throw new HttpError(401, "Authenticated user does not exist.");
    }

    if (!user.isActive) {
      throw new HttpError(403, "User account is inactive.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

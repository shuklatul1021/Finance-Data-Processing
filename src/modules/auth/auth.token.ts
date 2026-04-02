import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import { isRoleName } from "../../types/auth.js";
import type { RoleName } from "../../types/auth.js";

export interface AccessTokenData {
  userId: number;
  email: string;
  role: RoleName;
}

export const issueAccessToken = (payload: AccessTokenData): string => {
  const signOptions: jwt.SignOptions = {
    subject: String(payload.userId),
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(
    { email: payload.email, role: payload.role },
    env.jwtSecret,
    signOptions,
  );
};

export const verifyAccessToken = (token: string): AccessTokenData => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (!decoded || typeof decoded === "string") {
      throw new HttpError(401, "Invalid token payload.");
    }

    const userId = Number(decoded.sub);
    const email = decoded.email;
    const role = decoded.role;

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(401, "Invalid token subject.");
    }

    if (typeof email !== "string") {
      throw new HttpError(401, "Invalid token email.");
    }

    if (typeof role !== "string" || !isRoleName(role)) {
      throw new HttpError(401, "Invalid token role.");
    }

    return {
      userId,
      email,
      role,
    };
  } catch {
    throw new HttpError(401, "Invalid or expired token.");
  }
};

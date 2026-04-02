import dotenv from "dotenv";

dotenv.config();

const parseString = (
  value: string | undefined,
  fallback: string,
): string => {
  if (!value) {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue || fallback;
};

const parsePort = (value: string | undefined): number => {
  const defaultPort = 4000;

  if (!value) {
    return defaultPort;
  }

  const parsedPort = Number(value);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return defaultPort;
  }

  return parsedPort;
};

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return (
    normalizedValue === "1" ||
    normalizedValue === "true" ||
    normalizedValue === "yes" ||
    normalizedValue === "on"
  );
};

export const env = {
  port: parsePort(process.env.PORT),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/finance_dashboard",
  databaseSsl: parseBoolean(process.env.DATABASE_SSL),
  bootstrapAdminEmail: parseString(
    process.env.BOOTSTRAP_ADMIN_EMAIL,
    "admin@finance.local",
  ),
  bootstrapAdminName: parseString(
    process.env.BOOTSTRAP_ADMIN_NAME,
    "Finance Administrator",
  ),
  bootstrapAdminPassword: parseString(
    process.env.BOOTSTRAP_ADMIN_PASSWORD,
    "Admin@12345",
  ),
  jwtSecret: parseString(
    process.env.JWT_SECRET,
    "finance-dashboard-dev-jwt-secret",
  ),
  jwtExpiresIn: parseString(process.env.JWT_EXPIRES_IN, "1h"),
};

import express from "express";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { initializeDatabase } from "./db/initDb.js";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import {
  apiRateLimiter,
  authLoginRateLimiter,
} from "./middleware/rateLimit.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { recordRouter } from "./modules/records/record.routes.js";
import { roleRouter } from "./modules/roles/role.routes.js";
import { userRouter } from "./modules/users/user.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/docs.json", (_req, res) => {
  res.status(200).json(swaggerSpec);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Finance Dashboard API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "list",
    },
  }),
);

// this is the rate limiting middleware to protect the API from abuse and brute-force attacks.
// the general API rate limiter applies to all routes under /api, while a more strict limiter is applied specifically to the login route to prevent brute-force login attempts.

app.use("/api", apiRateLimiter);
app.use("/api/auth/login", authLoginRateLimiter);

// this is main API route setup, i mount the routers for different modules under their respective paths.
// each router handles the routes related to its module, and they are all protected by the authentication and authorization middleware defined within those routers.

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/roles", roleRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/records", recordRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await initializeDatabase();

  app.listen(env.port, () => {
    console.log(`Finance dashboard API listening on port ${env.port}`);
  });
};

void startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

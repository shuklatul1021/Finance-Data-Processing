import path from "node:path";

import swaggerJSDoc from "swagger-jsdoc";

import { env } from "../config/env.js";

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Finance Dashboard API",
    version: "1.0.0",
    description:
      "A API reference for the Finance Dashboard backend. It explains how to authenticate, manage users and records, and read dashboard analytics clearly.",
  },
  servers: [
    {
      url: `http://localhost:${env.port}`,
      description: "Local development server",
    },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [path.join(process.cwd(), "src", "docs", "openapi.ts")],
};

export const swaggerSpec = swaggerJSDoc(options);

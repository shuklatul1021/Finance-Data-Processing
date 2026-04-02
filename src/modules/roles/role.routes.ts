import { Router } from "express";

import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeAccess } from "../../middleware/authorize.js";
import { listRoles } from "./role.repository.js";

const roleRouter = Router();

roleRouter.use(authenticate);

roleRouter.get(
  "/",
  authorizeAccess("roles", "read"),
  asyncHandler(async (_req, res) => {
    const roles = await listRoles();
    res.json({ data: roles });
  }),
);

export { roleRouter };

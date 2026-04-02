/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Health and service-level endpoints.
 *   - name: Authentication
 *     description: Sign in, inspect your session identity, and view role permissions.
 *   - name: Users
 *     description: Create and manage users (admin actions) and read your own profile.
 *   - name: Roles
 *     description: List available role definitions and descriptions.
 *   - name: Records
 *     description: Manage financial records with filtering, search, pagination, and soft delete support.
 *   - name: Dashboard
 *     description: Aggregated analytics for income, expenses, category totals, and trends.
 *
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Unauthorized access.
 *
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@finance.local
 *         password:
 *           type: string
 *           format: password
 *           example: Admin@12345
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         fullName:
 *           type: string
 *           example: Finance Administrator
 *         email:
 *           type: string
 *           format: email
 *           example: admin@finance.local
 *         role:
 *           type: string
 *           enum: [viewer, analyst, admin]
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           enum: [viewer, analyst, admin]
 *         description:
 *           type: string
 *           example: Can create, update, and manage records and users.
 *
 *     FinancialRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 42
 *         amount:
 *           type: number
 *           format: float
 *           example: 1250.75
 *         type:
 *           type: string
 *           enum: [income, expense]
 *         category:
 *           type: string
 *           example: Consulting
 *         date:
 *           type: string
 *           format: date
 *           example: 2026-04-01
 *         notes:
 *           type: string
 *           nullable: true
 *           example: Project invoice
 *         createdByUserId:
 *           type: integer
 *           example: 1
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         pageSize:
 *           type: integer
 *           example: 10
 *         totalItems:
 *           type: integer
 *           example: 125
 *         totalPages:
 *           type: integer
 *           example: 13
 *         hasNextPage:
 *           type: boolean
 *           example: true
 *         hasPreviousPage:
 *           type: boolean
 *           example: false
 */

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Check API health
 *     description: Quick endpoint to confirm the server is alive and reachable.
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in and get a JWT access token
 *     description: Use email and password credentials to create an authenticated API session.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *                     expiresIn:
 *                       type: string
 *                       example: 1h
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     permissions:
 *                       type: object
 *                       description: Policy matrix for what this role can do.
 *       400:
 *         description: Validation error in request body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current signed-in user
 *     description: Returns your profile and effective permission matrix for frontend feature gating.
 *     responses:
 *       200:
 *         description: Current user profile and permissions.
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/auth/permissions:
 *   get:
 *     tags: [Authentication]
 *     summary: Get role permission policy
 *     description: Useful for UI personalization to hide disallowed actions before calling APIs.
 *     responses:
 *       200:
 *         description: Current role and permission policy.
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get your own user profile
 *     description: Any authenticated active user can fetch their own profile.
 *     responses:
 *       200:
 *         description: Current user profile.
 *       401:
 *         description: Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: Admin endpoint to list all users in the system.
 *     responses:
 *       200:
 *         description: Users fetched successfully.
 *       403:
 *         description: Not enough permissions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Admin endpoint for onboarding users with a starting role and active status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, role]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jane Analyst
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.analyst@finance.local
 *               password:
 *                 type: string
 *                 format: password
 *                 example: JanePass!123
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Validation failure.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not enough permissions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Admin endpoint to fetch a single user by identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User fetched successfully.
 *       404:
 *         description: User not found.
 *
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile fields
 *     description: Admin endpoint to update full name and/or email.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       404:
 *         description: User not found.
 */

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's role
 *     description: Admin endpoint to update role assignment.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *     responses:
 *       200:
 *         description: Role updated successfully.
 *       404:
 *         description: User not found.
 */

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate user
 *     description: Admin endpoint to control whether a user can access protected APIs.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated successfully.
 *       404:
 *         description: User not found.
 */

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List role definitions
 *     description: Admin endpoint to list all available roles and their business meaning.
 *     responses:
 *       200:
 *         description: Roles fetched successfully.
 *       403:
 *         description: Not enough permissions.
 */

/**
 * @openapi
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: List financial records
 *     description: Read records with flexible filters, full-text style search, and paginated results.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Searches category, notes, and type.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Admin-only flag for viewing soft-deleted records.
 *     responses:
 *       200:
 *         description: Records fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FinancialRecord'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 filters:
 *                   type: object
 *       403:
 *         description: Not enough permissions.
 *
 *   post:
 *     tags: [Records]
 *     summary: Create financial record
 *     description: Admin endpoint to add an income or expense entry.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 1250.75
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *                 example: Consulting
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-01
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Record created successfully.
 *       400:
 *         description: Validation failure.
 */

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get financial record by ID
 *     description: Fetch a single active financial record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record fetched successfully.
 *       404:
 *         description: Record not found.
 *
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record
 *     description: Admin endpoint to edit one or more fields of an active record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Record updated successfully.
 *       404:
 *         description: Record not found.
 *
 *   delete:
 *     tags: [Records]
 *     summary: Soft delete a financial record
 *     description: Admin endpoint that marks a record as deleted instead of removing it permanently.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Record soft deleted successfully.
 *       404:
 *         description: Record not found.
 */

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard summary snapshot
 *     description: Returns a complete snapshot with totals, category breakdowns, recent activity, and trends.
 *     responses:
 *       200:
 *         description: Summary loaded successfully.
 */

/**
 * @openapi
 * /api/dashboard/category-totals:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get category-wise totals
 *     description: Compare spending and income category-by-category.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Category totals loaded successfully.
 */

/**
 * @openapi
 * /api/dashboard/recent-activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent financial activity
 *     description: Useful for activity feeds and timeline cards in the UI.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent activity loaded successfully.
 */

/**
 * @openapi
 * /api/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get trend points over time
 *     description: Choose monthly or weekly buckets to analyze income/expense movement.
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [monthly, weekly]
 *           default: monthly
 *       - in: query
 *         name: periods
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: Trend data loaded successfully.
 */

/**
 * @openapi
 * /api/dashboard/insights:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get advanced financial insights
 *     description: Analyst/Admin endpoint with derived metrics like ratio, top categories, and average amounts.
 *     responses:
 *       200:
 *         description: Insights loaded successfully.
 *       403:
 *         description: Not enough permissions.
 */

export {};

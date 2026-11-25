# MASTER PROJECT DEVELOPMENT PROMPT

# Military Asset Management System (MAMS)

## 1. YOUR ROLE AND RESPONSIBILITY

Act as a Senior Full-Stack Software Architect, Backend Engineer, Frontend Engineer, Database Engineer, UI/UX Designer, QA Engineer, Security Engineer, and DevOps Engineer.

Your task is to design, develop, test, document, and prepare a complete enterprise-grade Military Asset Management System (MAMS) from scratch.

This is a complete software engineering project, not a prototype, static UI demonstration, or basic CRUD application.

You are responsible for the entire development lifecycle:

1. Requirements analysis.
2. System architecture design.
3. Database architecture and implementation.
4. Backend API development.
5. Authentication and authorization.
6. Frontend application development.
7. Integration of frontend and backend.
8. Inventory calculations and business logic.
9. Security implementation.
10. Testing and debugging.
11. Production deployment preparation.
12. Technical documentation.

Do not stop after generating the frontend or project structure. The final application must have a functioning frontend, backend, PostgreSQL database, authentication, role-based permissions, and integrated business operations.

Work systematically and verify each module before moving to the next.

---

# 2. PROJECT OVERVIEW

Project Name: Military Asset Management System (MAMS)

## Objective

Develop a centralized Military Asset Management System that manages and tracks military assets across multiple military bases.

The system must provide accurate inventory visibility, movement tracking, assignment management, expenditure recording, operational reporting, and accountability.

The application must support multiple bases and multiple user roles.

## Core objectives

- Centralized asset inventory management.
- Base-wise inventory tracking.
- Opening balance and closing balance calculations.
- Purchase tracking.
- Inter-base asset transfer management.
- Asset assignment tracking.
- Expenditure recording.
- Detailed operational history.
- Role-Based Access Control (RBAC).
- Base-level data isolation.
- Centralized audit logging.
- Secure authentication.
- Production-ready deployment architecture.

The system is intended for administrative asset and logistics management. Do not introduce weapon targeting, tactical planning, surveillance, or other combat functionality.

---

# 3. MANDATORY TECHNOLOGY STACK

Use the following technologies consistently throughout the project.

## Frontend

- React with Vite.
- JavaScript ES6+.
- Tailwind CSS.
- React Router DOM.
- Axios.
- Lucide React.
- Recharts.
- React Context API for authentication state.
- React Hook Form for forms.
- Zod for validation where appropriate.

## Backend

- Node.js.
- Express.js.
- JavaScript ES Modules.
- Prisma ORM.
- PostgreSQL.
- JWT authentication.
- bcrypt password hashing.
- Zod request validation.
- Helmet for HTTP security headers.
- CORS configuration.
- Centralized error handling.

## Database

PostgreSQL is mandatory.

Use Prisma ORM for database schema management, migrations, relationships, and database queries.

Do not use SQLite as the primary database.

Do not use MongoDB.

Do not replace PostgreSQL with JSON files, browser local storage, or mock databases.

## Deployment

Prepare the application for:

- Frontend: Vercel.
- Backend: Render.
- Database: Render PostgreSQL.

The application must support separate development and production environments.

Do not build an architecture that depends on localhost URLs or local database files.

---

# 4. USER ROLES AND TEST ACCOUNTS

Implement three primary roles.

## Role 1: ADMIN

Username: admin_user

Initial development password: AdminPass123!

Assigned access: All bases (Global).

Permissions:

- View all military bases.
- View global inventory.
- Access all dashboards.
- Manage bases.
- Manage users.
- Manage equipment categories and types.
- Manage purchases.
- Manage transfers.
- View all assignments.
- View all expenditures.
- Access global audit logs.
- View consolidated reports.
- Filter inventory by base, category, equipment type, and date.
- Perform authorized administrative corrections with audit logging.

Admin has global access.

## Role 2: BASE COMMANDER

Username: commander_alpha

Initial development password: CommandPass123!

Assigned base: Fort Alpha (Base #1).

Permissions:

- View only Fort Alpha inventory.
- Access only the Fort Alpha dashboard.
- View Fort Alpha purchases and transfers.
- View Fort Alpha assignments.
- Record and manage authorized local assignments.
- Record expenditures for Fort Alpha.
- View Fort Alpha inventory reports.
- View relevant base-level audit history.

The Base Commander must never access another base's information.

Do not rely on frontend restrictions alone.

Enforce base-level access restrictions in the backend.

## Role 3: LOGISTICS OFFICER

Username: logistics_officer

Initial development password: LogisticsPass123!

Assigned base: Base #1 / Global Operations.

Permissions:

- Access logistics operations.
- Manage authorized purchases.
- Initiate inter-base transfers.
- View transfer history.
- View purchase history.
- Monitor operational inventory movements.
- View relevant logistics audit records.

Treat this account as a global logistics operations account, with Base #1 as its home-base association.

Make its scope configurable through backend authorization policies so that permissions can be restricted later without rewriting the application.

The Logistics Officer must not automatically receive user administration or unrestricted administrative permissions.

## Credential security requirements

These credentials are only initial development/test credentials.

- Never store plain-text passwords in PostgreSQL.
- Hash all passwords using bcrypt.
- Create a database seed script.
- Read initial credentials from environment variables.
- Do not hardcode production credentials into source code.
- Never expose password hashes through APIs.
- Never commit .env files.
- Require secure credential replacement before production use.
- Do not automatically seed production accounts with public demo passwords.

Create a clear README section explaining how to initialize the three test accounts.

---

# 5. ROLE-BASED ACCESS CONTROL

RBAC is one of the most important requirements of this application.

Implement authorization in the backend, not just the React interface.

Create reusable middleware:

- authenticateToken
- authorizeRoles
- enforceBaseScope
- authorizeResourceAccess

## Authentication workflow

1. User enters username and password.
2. Backend finds the account.
3. Backend verifies the password using bcrypt.
4. Backend generates a signed JWT.
5. JWT includes user ID, role, and relevant base association.
6. Frontend stores and uses the authentication session securely.
7. Protected API requests include the access token.
8. Backend verifies the token and loads authoritative user permissions.
9. Backend authorizes the requested operation.

Never trust a user-supplied role or base ID.

The role and base scope must come from the authenticated server-side user record.

## Critical base isolation rules

For Base Commander:

- Ignore any attempt to provide another base ID.
- Automatically restrict queries to the assigned base.
- Prevent access to another base through URL manipulation.
- Prevent access through query parameter manipulation.
- Prevent access through request body manipulation.
- Validate both source and destination base permissions for transfers.
- Return HTTP 403 for forbidden operations.

For Admin:

- Permit global operations according to administrator permissions.

For Logistics Officer:

- Permit authorized logistics operations across bases.
- Do not grant unrelated administrator permissions.

All authorization checks must be performed on the backend for every protected operation.

---

# 6. DATABASE ARCHITECTURE

Design a normalized relational PostgreSQL database.

Use Prisma schema definitions and proper foreign key relationships.

Create the following main entities.

## 1. Users

Fields:

- id
- username
- passwordHash
- role
- baseId
- isActive
- createdAt
- updatedAt

## 2. Bases

Fields:

- id
- name
- location
- description
- isActive
- createdAt
- updatedAt

Seed at least Fort Alpha as Base #1.

Create additional generic test bases so cross-base transfer functionality can be demonstrated.

## 3. EquipmentTypes

Fields:

- id
- name
- category
- description
- unit
- isActive
- createdAt
- updatedAt

Categories:

- VEHICLE
- WEAPON
- AMMUNITION
- OTHER

Use administrative inventory records only.

## 4. Purchases

Fields:

- id
- baseId
- equipmentTypeId
- quantity
- purchaseDate
- referenceNumber
- supplier
- remarks
- createdBy
- createdAt

## 5. Transfers

Fields:

- id
- sourceBaseId
- destinationBaseId
- equipmentTypeId
- quantity
- status
- referenceNumber
- remarks
- initiatedBy
- approvedBy
- completedAt
- createdAt
- updatedAt

Transfer statuses:

- PENDING
- APPROVED
- IN_TRANSIT
- COMPLETED
- REJECTED
- CANCELLED

## 6. Assignments

Fields:

- id
- baseId
- equipmentTypeId
- quantity
- assignedTo
- assignmentDate
- status
- remarks
- createdBy
- createdAt
- updatedAt

## 7. Expenditures

Fields:

- id
- baseId
- equipmentTypeId
- quantity
- expenditureDate
- reason
- referenceNumber
- remarks
- createdBy
- createdAt

## 8. AuditLogs

Fields:

- id
- userId
- action
- entityType
- entityId
- baseId
- previousValues
- newValues
- details
- ipAddress
- createdAt

Store relevant changes in a structured format.

Audit records must not be editable by normal application users.

## 9. InventoryTransactions

Create a transaction ledger to track stock changes.

Fields:

- id
- baseId
- equipmentTypeId
- transactionType
- quantity
- referenceType
- referenceId
- createdBy
- createdAt

Use appropriate positive and negative stock movements.

This ledger should provide traceability for purchases, completed transfers, assignments, returns, and expenditures.

Create indexes on frequently queried fields.

Add appropriate constraints for positive quantities, unique usernames, valid roles, and valid relationships.

---

# 7. INVENTORY CALCULATION ENGINE

This is a critical part of the project.

Implement accurate inventory calculations based on recorded transactions.

Required formula:

Closing Balance = Opening Balance + Net Movement - Assigned - Expended

Net Movement = Purchases + Transfers In - Transfers Out

Opening Balance must represent the stock available at the beginning of the selected reporting period.

Net Movement must include only movements applicable to the selected period.

Assigned and Expended quantities must also be calculated for the same reporting period.

The dashboard must support:

- Date range filtering.
- Base filtering.
- Equipment category filtering.
- Equipment type filtering.

## Important calculation rules

1. Only completed transfers affect inventory.
2. Pending transfers must not increase or decrease available inventory.
3. Approved and in-transit transfers must follow clearly defined stock reservation rules.
4. Do not count a transfer twice.
5. Do not count assignments and expenditures twice.
6. Prevent negative available stock.
7. Handle simultaneous operations safely.
8. Use database transactions for stock-changing operations.
9. Maintain historical inventory accuracy.
10. Provide an explanation of the calculation in the dashboard.

Maintain a consistent inventory ledger as the source of truth.

Do not simply calculate stock from the latest purchase record.

Ensure that historical reports remain correct even when new transactions are added.

---

# 8. BACKEND API DEVELOPMENT

Create a modular Express backend.

Suggested folder structure:

backend/
prisma/
schema.prisma
seed.js
migrations/
src/
config/
database.js
controllers/
authController.js
userController.js
baseController.js
equipmentController.js
dashboardController.js
purchaseController.js
transferController.js
assignmentController.js
expenditureController.js
auditController.js
middleware/
authMiddleware.js
rbacMiddleware.js
errorMiddleware.js
validationMiddleware.js
routes/
authRoutes.js
userRoutes.js
baseRoutes.js
equipmentRoutes.js
dashboardRoutes.js
purchaseRoutes.js
transferRoutes.js
assignmentRoutes.js
expenditureRoutes.js
auditRoutes.js
services/
inventoryService.js
transferService.js
auditService.js
dashboardService.js
validators/
utils/
app.js
server.js
tests/
.env.example
package.json

You may improve this structure if there is a clear architectural reason.

## Required API endpoints

Authentication:

POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/refresh

Dashboard:

GET /api/dashboard/summary
GET /api/dashboard/movements
GET /api/dashboard/inventory
GET /api/dashboard/reports

Bases:

GET /api/bases
POST /api/bases
GET /api/bases/:id
PUT /api/bases/:id

Equipment:

GET /api/equipment
POST /api/equipment
PUT /api/equipment/:id
GET /api/equipment/:id

Purchases:

GET /api/purchases
POST /api/purchases
GET /api/purchases/:id

Transfers:

GET /api/transfers
POST /api/transfers
PUT /api/transfers/:id/approve
PUT /api/transfers/:id/dispatch
PUT /api/transfers/:id/complete
PUT /api/transfers/:id/reject
PUT /api/transfers/:id/cancel

Assignments:

GET /api/assignments
POST /api/assignments
PUT /api/assignments/:id

Expenditures:

GET /api/expenditures
POST /api/expenditures

Audit:

GET /api/audit-logs

Users:

GET /api/users
POST /api/users
PUT /api/users/:id
PATCH /api/users/:id/status

Implement pagination, filtering, validation, consistent response structures, and proper HTTP status codes.

Do not expose unrestricted database access through any API.

---

# 9. TRANSFER MANAGEMENT

Implement a reliable inter-base transfer workflow.

Example:

Base Alpha transfers 20 units of an equipment type to Base Bravo.

Workflow:

1. Logistics Officer creates transfer request.
2. Backend validates the source and destination bases.
3. Backend validates the requested quantity.
4. The transfer is recorded as PENDING.
5. An authorized user approves it.
6. Dispatch updates the transfer status.
7. Completion confirms receipt.
8. Stock ledger entries are created exactly once.
9. Both bases receive the correct inventory changes.
10. Audit logs record every state transition.

Use PostgreSQL transactions and appropriate row locking or equivalent concurrency control.

Prevent:

- Transfers to the same base.
- Zero or negative quantities.
- Transfers exceeding available stock.
- Duplicate completion.
- Unauthorized transfer modifications.
- Double deductions.
- Double additions.

Define cancellation and rejection behavior clearly.

All inventory-changing operations must be atomic.

---

# 10. FRONTEND APPLICATION

Build a polished enterprise-grade responsive React application.

Do not create a basic student CRUD interface.

The interface should look like a modern enterprise logistics and asset management platform.

## Visual direction

Use:

- Professional navy and slate foundation.
- White and light-grey content surfaces.
- Blue primary accent.
- Green for successful operations.
- Amber for pending operations.
- Red for errors and critical warnings.
- Clear typography.
- Consistent spacing.
- Professional charts and tables.
- Subtle shadows and borders.
- Responsive layouts.

Avoid:

- Excessive gradients.
- Excessive animations.
- Cartoonish icons.
- Oversized dashboard cards.
- Unnecessary decorative elements.
- Inconsistent colors.
- Cluttered layouts.

Support desktop, tablet, and mobile.

Include light and dark themes if practical without compromising the core functionality.

## Application layout

Create:

1. Login page.
2. Main application shell.
3. Responsive sidebar.
4. Top navigation bar.
5. Role-specific dashboard.
6. Inventory page.
7. Purchases page.
8. Transfers page.
9. Assignments page.
10. Expenditures page.
11. Reports page.
12. Audit logs page.
13. User management page.
14. Base management page.
15. Equipment management page.
16. Profile and settings page.

## Dashboard

Display:

- Opening Balance.
- Purchases.
- Transfers In.
- Transfers Out.
- Net Movement.
- Assigned Assets.
- Expenditures.
- Closing Balance.

Create interactive dashboard cards.

Clicking Net Movement must open a modal showing:

Purchases (+)
Transfers In (+)
Transfers Out (-)
Total Net Movement

Create appropriate charts:

- Inventory by category.
- Stock movement trends.
- Base-wise inventory comparison.
- Purchase history.
- Transfer history.
- Expenditure trends.

Provide date and base filters where authorized.

Never display another base's data to a Base Commander.

## Inventory page

Provide:

- Equipment name.
- Category.
- Base.
- Opening balance.
- Purchases.
- Transfers in.
- Transfers out.
- Assigned.
- Expended.
- Closing balance.
- Available quantity.

Add search, sorting, pagination, and filters.

## Purchases page

Provide a purchase creation form and purchase history table.

Validate all fields before submission.

## Transfers page

Provide:

- Source base.
- Destination base.
- Equipment type.
- Quantity.
- Reference number.
- Remarks.
- Current status.
- Transfer history.
- Approval and completion actions according to permissions.

Use confirmation dialogs for critical operations.

## Assignments page

Provide asset assignment creation, history, and status tracking.

## Expenditures page

Provide expenditure recording, validation, and history.

## Audit page

Display:

- User.
- Action.
- Entity.
- Base.
- Date and time.
- Relevant changes.

Allow authorized filtering.

---

# 11. AUTHENTICATION AND FRONTEND SECURITY

Implement:

- Login form.
- Session handling.
- Protected routes.
- Role-based navigation.
- Unauthorized page.
- Logout.
- Token expiry handling.
- Authentication context.
- API request interceptors.

Prefer short-lived access tokens and secure refresh-token handling using HttpOnly, Secure, SameSite cookies.

Do not store sensitive tokens in localStorage.

Do not rely on hiding frontend navigation as an authorization mechanism.

The backend remains the final authority.

If an account is deactivated, invalidate its ability to access protected operations.

---

# 12. ERROR HANDLING AND VALIDATION

Implement centralized backend error handling.

Use appropriate responses:

- 200: Successful request.
- 201: Resource created.
- 400: Invalid input.
- 401: Authentication required.
- 403: Insufficient permissions.
- 404: Resource not found.
- 409: Conflict.
- 422: Validation failure where appropriate.
- 500: Unexpected server error.

The frontend must display understandable messages.

Never expose stack traces, database credentials, internal SQL, or sensitive implementation details to users.

Validate data on both frontend and backend.

---

# 13. TESTING REQUIREMENTS

Testing is mandatory.

Do not declare the project complete simply because the application starts.

Create automated tests for the following.

## Authentication tests

- Valid login.
- Invalid password.
- Unknown username.
- Expired JWT.
- Missing JWT.
- Deactivated user.

## RBAC tests

- Admin accesses global dashboard.
- Base Commander accesses Fort Alpha.
- Base Commander attempts to access another base.
- Base Commander attempts to change baseId manually.
- Logistics Officer accesses authorized logistics endpoints.
- Logistics Officer attempts unauthorized user management.

## Inventory tests

- Purchase increases inventory.
- Transfer out decreases source inventory on completion.
- Transfer in increases destination inventory on completion.
- Pending transfer does not affect completed-stock totals.
- Assignment updates available inventory.
- Expenditure reduces available inventory.
- Negative inventory is prevented.
- Historical calculations are correct.

## Transaction tests

- Successful transfer.
- Failed transfer rollback.
- Duplicate transfer completion.
- Concurrent stock modification.
- Unauthorized transfer.

## Audit tests

Verify that:

- Every successful inventory mutation creates an audit record.
- Audit records contain the authenticated user.
- Previous and new values are recorded where applicable.
- Failed operations do not create misleading success logs.
- Normal users cannot edit audit history.

Use automated integration tests with a dedicated test PostgreSQL database.

Do not run destructive test operations against production data.

---

# 14. DEPLOYMENT-READY ARCHITECTURE

This project must be developed with deployment as a core requirement from the beginning.

Do not postpone deployment architecture until the final stage.

## Environment separation

Create:

- .env.example
- .env.development
- Production environment variable documentation.
- Separate test database configuration.

Never commit actual secrets.

## Backend deployment: Render

Prepare:

- Production start script.
- Build script.
- Prisma generation.
- Database migration process.
- Health-check endpoint.
- CORS configuration.
- Environment variable configuration.
- Production logging.
- Graceful shutdown.

Required environment variables:

DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
CLIENT_URL
NODE_ENV
PORT

Add other necessary variables where required.

The backend must listen on the port provided by Render.

Do not assume a fixed localhost port in production.

## Database deployment: Render PostgreSQL

Prepare the database for hosted PostgreSQL.

Ensure:

- Prisma migrations work in production.
- Database connections use DATABASE_URL.
- Production database is never initialized with development-only demo credentials.
- Foreign keys and constraints are enforced.
- Connection failures are handled correctly.
- Backups and recovery considerations are documented.

Do not rely on an in-memory database.

## Frontend deployment: Vercel

Prepare:

- Vite production build.
- Environment-based API URL.
- Vercel configuration.
- React Router rewrite configuration.
- Production build validation.

Required variable:

VITE_API_BASE_URL

The frontend must communicate with the deployed Render backend.

Do not hardcode localhost API addresses.

## Deployment documentation

Create a complete DEPLOYMENT.md containing:

1. Create PostgreSQL database on Render.
2. Configure backend environment variables.
3. Connect backend repository to Render.
4. Generate Prisma Client.
5. Run production migrations.
6. Deploy backend.
7. Verify backend health endpoint.
8. Configure Vercel frontend.
9. Add production API URL.
10. Configure backend CORS with the deployed frontend domain.
11. Deploy frontend.
12. Verify login and all critical application workflows.
13. Explain how to create initial production admin credentials securely.

Also document how to configure a custom domain.

Do not claim the application is deployed unless the deployment has actually succeeded.

---

# 15. PROJECT STRUCTURE

Use a clean monorepo structure.

military-asset-management/
|
|-- frontend/
| |-- public/
| |-- src/
| | |-- assets/
| | |-- components/
| | |-- layouts/
| | |-- pages/
| | |-- context/
| | |-- hooks/
| | |-- services/
| | |-- utils/
| | |-- routes/
| | |-- App.jsx
| | |-- main.jsx
| |-- package.json
| |-- vite.config.js
|
|-- backend/
| |-- prisma/
| |-- src/
| | |-- config/
| | |-- controllers/
| | |-- middleware/
| | |-- routes/
| | |-- services/
| | |-- validators/
| | |-- utils/
| | |-- app.js
| | |-- server.js
| |-- tests/
| |-- package.json
|
|-- docs/
| |-- ARCHITECTURE.md
| |-- DATABASE_SCHEMA.md
| |-- API_DOCUMENTATION.md
| |-- RBAC_MATRIX.md
| |-- DEPLOYMENT.md
| |-- TESTING.md
|
|-- .gitignore
|-- README.md

You may improve the structure when necessary, but maintain separation between frontend, backend, database, and documentation.

---

# 16. DOCUMENTATION

Create a comprehensive README.md.

It must include:

- Project overview.
- Problem statement.
- Objectives.
- Main features.
- Technology stack.
- Architecture explanation.
- Database explanation.
- User roles.
- Installation instructions.
- Environment setup.
- Database migration commands.
- Seed commands.
- Development commands.
- Testing commands.
- Production build commands.
- Deployment instructions.
- API documentation links.
- Test account initialization instructions.

Create a system architecture diagram using Mermaid.

Create an ER diagram using Mermaid.

Create a clear RBAC permissions matrix.

Document the inventory calculation methodology.

---

# 17. IMPORTANT DEVELOPMENT RULES

These rules must be followed throughout the development.

## DO

1. Build the complete application incrementally.
2. Use reusable React components.
3. Use modular backend architecture.
4. Use Prisma migrations.
5. Use PostgreSQL transactions for inventory-changing operations.
6. Use server-side validation.
7. Implement actual RBAC.
8. Implement base-level data isolation.
9. Maintain accurate inventory calculations.
10. Maintain audit logs.
11. Write automated tests.
12. Use environment variables.
13. Keep frontend and backend independently deployable.
14. Use production-ready API configuration.
15. Write understandable documentation.
16. Run builds and tests after major modules.
17. Fix errors before proceeding.
18. Use realistic but clearly identified development seed data.
19. Maintain consistent UI design.
20. Verify every role's actual permissions.

## DO NOT

1. Do not create only a frontend.
2. Do not use static dashboard numbers as actual application data.
3. Do not use hardcoded inventory calculations.
4. Do not use SQLite.
5. Do not use localStorage as a database.
6. Do not hardcode localhost API URLs.
7. Do not hardcode passwords in source code.
8. Do not store plain-text passwords.
9. Do not trust frontend authorization.
10. Do not trust client-provided role or base IDs.
11. Do not allow Base Commanders to access other bases.
12. Do not allow negative inventory.
13. Do not allow duplicate transfer processing.
14. Do not skip database transactions.
15. Do not skip audit logging.
16. Do not create fake API responses to make the UI appear functional.
17. Do not leave major buttons without working functionality.
18. Do not leave TODO placeholders for critical business logic.
19. Do not ignore errors during development.
20. Do not claim tests passed without running them.
21. Do not claim production deployment succeeded without verification.
22. Do not expose credentials or secrets in GitHub.
23. Do not create unnecessary microservices or overcomplicate the architecture.

---

# 18. IMPLEMENTATION PHASES

Follow this development sequence.

## PHASE 1: Planning and architecture

- Analyze all requirements.
- Finalize database relationships.
- Finalize role permissions.
- Design API structure.
- Design frontend navigation.
- Create architecture documentation.
- Create the project directory.

Deliverable: Complete architecture and initialized project.

## PHASE 2: Database and backend foundation

- Initialize Node.js and Express.
- Configure Prisma.
- Connect PostgreSQL.
- Create database models.
- Create migrations.
- Create seed scripts.
- Add error handling.
- Add validation.

Deliverable: Working backend and PostgreSQL database.

## PHASE 3: Authentication and RBAC

- Implement login.
- Implement JWT authentication.
- Implement password hashing.
- Implement authorization middleware.
- Implement base isolation.
- Initialize three test accounts.
- Test all permissions.

Deliverable: Fully functional and tested authentication system.

## PHASE 4: Core business operations

- Equipment management.
- Purchase management.
- Transfer workflow.
- Assignment management.
- Expenditure management.
- Inventory ledger.
- Audit logging.

Deliverable: Functional inventory management backend.

## PHASE 5: Inventory calculation and reporting

- Implement opening balance.
- Implement purchases and movements.
- Implement net movement.
- Implement assigned and expended quantities.
- Implement closing balance.
- Implement date filtering.
- Verify historical calculations.

Deliverable: Accurate inventory reporting APIs.

## PHASE 6: Frontend development

- Design the application shell.
- Create login page.
- Create protected routes.
- Create role-specific dashboards.
- Create inventory interface.
- Create purchases and transfers.
- Create assignments and expenditures.
- Create reports and audit pages.
- Add responsive layouts.

Deliverable: Complete React frontend.

## PHASE 7: Full-stack integration

- Connect every frontend page to the actual backend.
- Integrate authentication.
- Integrate dashboard metrics.
- Integrate all CRUD and transaction workflows.
- Verify role-based navigation.
- Verify API authorization.
- Fix integration errors.

Deliverable: Complete working application.

## PHASE 8: Testing and quality assurance

- Run backend tests.
- Run frontend tests.
- Run integration tests.
- Test all three accounts.
- Test cross-base access restrictions.
- Test transfer transactions.
- Test inventory calculations.
- Test responsive layouts.
- Run production builds.
- Fix all critical errors.

Deliverable: Verified application with test results.

## PHASE 9: Deployment preparation

- Configure production environment.
- Configure Render backend.
- Configure Render PostgreSQL.
- Configure Vercel frontend.
- Prepare migrations.
- Prepare health checks.
- Prepare production documentation.
- Verify production build.
- Provide deployment instructions.

Deliverable: Application ready for deployment.

---

# 19. FINAL ACCEPTANCE CRITERIA

The project is considered complete only when all the following conditions are satisfied.

[ ] Frontend runs successfully.

[ ] Backend runs successfully.

[ ] PostgreSQL database connects successfully.

[ ] Prisma migrations work.

[ ] Three test accounts can log in.

[ ] Passwords are securely hashed.

[ ] Admin has global access.

[ ] Base Commander is restricted to Fort Alpha.

[ ] Logistics Officer has authorized logistics access.

[ ] Backend enforces RBAC.

[ ] Base isolation is verified.

[ ] Purchases work.

[ ] Transfers work.

[ ] Assignments work.

[ ] Expenditures work.

[ ] Inventory calculations are accurate.

[ ] Historical balances are accurate.

[ ] Audit logging works.

[ ] All major frontend pages are connected to real APIs.

[ ] Automated tests pass.

[ ] Frontend production build succeeds.

[ ] Backend production configuration is ready.

[ ] Render deployment instructions are complete.

[ ] Vercel deployment instructions are complete.

[ ] README and technical documentation are complete.

[ ] No critical security or integration issues remain.

---

# 20. HOW YOU MUST WORK WITH ME

I want you to work as an autonomous development agent while keeping the implementation understandable and maintainable.

Important working instructions:

1. First inspect the workspace. It should be treated as a new project.
2. Do not assume any existing source code.
3. Create the architecture before generating large amounts of code.
4. Create the complete directory structure.
5. Implement one phase at a time.
6. After every phase, run the appropriate checks.
7. If an error occurs, investigate and fix the root cause.
8. Do not silently skip incomplete requirements.
9. Maintain a DEVELOPMENT_PROGRESS.md file.
10. Update this file whenever a phase or major module is completed.
11. Maintain a list of remaining tasks.
12. Do not overwrite working modules unnecessarily.
13. Do not ask me to manually write code that you can implement.
14. Ask me only when an important business rule or external configuration requires my decision.
15. Do not stop after giving instructions; actually create and implement the files in the workspace.

If a deployment requires account access, credentials, domain configuration, or an external approval, prepare everything possible and clearly explain the remaining manual step.

At the end of each phase, report:

- What was implemented.
- Which files were created or modified.
- Which commands were executed.
- Which tests were run.
- Whether they passed.
- Any remaining issues.
- What the next phase will implement.

Do not falsely report completion.

## FINAL INSTRUCTION

Start with PHASE 1.

Analyze the requirements, create the architecture, establish the project structure, and then continue through the implementation phases.

Build this as a complete, secure, maintainable, deployment-ready Military Asset Management System.

The final result must be a real working full-stack application, not merely a visual prototype or locally running demonstration.

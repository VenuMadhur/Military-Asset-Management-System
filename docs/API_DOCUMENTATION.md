# API Documentation — Military Asset Management System (MAMS)

Base URL: `<API_HOST>/api`

All protected endpoints require `Authorization: Bearer <accessToken>`. All responses follow a consistent JSON envelope:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Human-readable error description",
    "details": []
  }
}
```

## 1. Health & Auth
- `GET /api/health` — Public health check (verifies PostgreSQL connectivity)
- `POST /api/auth/login` — Authenticates user, returns access token + user profile, sets `HttpOnly` refresh cookie
- `POST /api/auth/refresh` — Validates `HttpOnly` refresh cookie, rotates refresh token, returns new access token
- `POST /api/auth/logout` — Clears refresh cookie and revokes server-side refresh token hash
- `GET /api/auth/me` — Returns authenticated user profile and effective permissions

## 2. Dashboard & Inventory
- `GET /api/dashboard/summary` — Query: `startDate`, `endDate`, `baseId`, `category`, `equipmentTypeId`. Returns KPI totals (`openingBalance`, `purchases`, `transfersIn`, `transfersOut`, `netMovement`, `assigned`, `expended`, `closingBalance`, `reservedQuantity`, `availableQuantity`).
- `GET /api/dashboard/movements` — Returns net movement breakdown and time-series data for charts.
- `GET /api/dashboard/inventory` — Returns paginated, sortable, filterable inventory rows by `(base, equipmentType)` with period calculations.
- `GET /api/dashboard/reports` — Returns consolidated category, base comparison, purchase, transfer, and expenditure report datasets.
- `POST /api/dashboard/adjustments` — (`ADMIN` only) Performs an audited administrative inventory correction.

## 3. Bases
- `GET /api/bases` — Lists bases (role-scoped)
- `POST /api/bases` — (`ADMIN`) Creates a military base
- `GET /api/bases/:id` — Returns base details (role-scoped; `403` if Base Commander requests another base)
- `PUT /api/bases/:id` — (`ADMIN`) Updates base details or status

## 4. Equipment Types
- `GET /api/equipment` — Lists equipment types (`search`, `category`, `isActive`, `page`, `limit`)
- `POST /api/equipment` — (`ADMIN`) Creates equipment type
- `GET /api/equipment/:id` — Returns equipment type details
- `PUT /api/equipment/:id` — (`ADMIN`) Updates equipment type

## 5. Purchases
- `GET /api/purchases` — Lists purchases (`baseId`, `equipmentTypeId`, `category`, `startDate`, `endDate`, `search`, `page`, `limit`)
- `POST /api/purchases` — (`ADMIN`, `LOGISTICS_OFFICER`) Records a purchase and appends `+quantity` `PURCHASE` ledger entry + audit log
- `GET /api/purchases/:id` — Gets purchase details (base-scoped)

## 6. Transfers
State Machine:
- `PENDING` -> `APPROVED` (`PUT /api/transfers/:id/approve`)
- `PENDING` -> `REJECTED` (`PUT /api/transfers/:id/reject`)
- `PENDING` or `APPROVED` -> `CANCELLED` (`PUT /api/transfers/:id/cancel`)
- `APPROVED` -> `IN_TRANSIT` (`PUT /api/transfers/:id/dispatch`)
- `IN_TRANSIT` -> `COMPLETED` (`PUT /api/transfers/:id/complete`)

Endpoints:
- `GET /api/transfers` — Lists transfers (`status`, `baseId`, `sourceBaseId`, `destinationBaseId`, `equipmentTypeId`, `startDate`, `endDate`, `page`, `limit`)
- `POST /api/transfers` — (`ADMIN`, `LOGISTICS_OFFICER`) Creates `PENDING` transfer after validating bases, positive quantity, and available stock
- `PUT /api/transfers/:id/approve` — Reserves stock at source base inside transaction
- `PUT /api/transfers/:id/dispatch` — Moves `APPROVED -> IN_TRANSIT`
- `PUT /api/transfers/:id/complete` — Atomically creates `TRANSFER_OUT` (`-qty`) and `TRANSFER_IN` (`+qty`) ledger entries and marks `COMPLETED`
- `PUT /api/transfers/:id/reject` — Marks `REJECTED`
- `PUT /api/transfers/:id/cancel` — Marks `CANCELLED` (releases reservation if `APPROVED`)

## 7. Assignments
- `GET /api/assignments` — (`ADMIN`, `BASE_COMMANDER`) Lists assignments
- `POST /api/assignments` — (`ADMIN`, `BASE_COMMANDER`) Validates available stock and creates `ACTIVE` assignment + `-qty` `ASSIGNMENT` ledger entry
- `PUT /api/assignments/:id` — (`ADMIN`, `BASE_COMMANDER`) Updates remarks or marks `RETURNED` (appending `+qty` `ASSIGNMENT_RETURN` ledger entry atomically)

## 8. Expenditures
- `GET /api/expenditures` — (`ADMIN`, `BASE_COMMANDER`) Lists expenditures
- `POST /api/expenditures` — (`ADMIN`, `BASE_COMMANDER`) Validates available stock and records expenditure + `-qty` `EXPENDITURE` ledger entry

## 9. Audit Logs & Users
- `GET /api/audit-logs` — Role-scoped read-only audit trail (`userId`, `action`, `entityType`, `baseId`, `startDate`, `endDate`, `page`, `limit`)
- `GET /api/users` — (`ADMIN`) Lists users (never returns `passwordHash` or `refreshTokenHash`)
- `POST /api/users` — (`ADMIN`) Creates user with bcrypt-hashed password
- `PUT /api/users/:id` — (`ADMIN`) Updates user role, base assignment, or password
- `PATCH /api/users/:id/status` — (`ADMIN`) Activates/deactivates user and revokes active refresh tokens

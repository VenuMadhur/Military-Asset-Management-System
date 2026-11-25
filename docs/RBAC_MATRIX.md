# RBAC & Authorization Matrix — MAMS

All permissions are enforced on the backend via `authenticateToken`, `authorizeRoles`, `enforceBaseScope`, and `authorizeResourceAccess` middleware.

## Role Definitions

| Role | Scope | Description |
| --- | --- | --- |
| `ADMIN` | Global (All Bases) | Full administrative, operational, user/base/equipment management, and global audit visibility |
| `BASE_COMMANDER` | Single Assigned Base (`Fort Alpha`) | Strictly isolated to assigned `baseId`; manages local assignments and expenditures; views local inventory, purchases, transfers, and base audit logs |
| `LOGISTICS_OFFICER` | Configurable Global Logistics (Home Base #1) | Manages purchases and inter-base transfer operations across bases; no user, base, or equipment catalog administration |

## Permissions Matrix

| Resource / Action | ADMIN | BASE_COMMANDER (Own Base Only) | LOGISTICS_OFFICER |
| --- | :---: | :---: | :---: |
| **Authentication (`/api/auth/*`)** | Yes | Yes | Yes |
| **Dashboard & Inventory (`/api/dashboard/*`)** | Global + Base Filter | Own Base Only (403 on other base) | Global + Base Filter (Logistics Policy) |
| **View Bases (`GET /api/bases`)** | All Bases | Own Base Only (403 on `:id` mismatch) | All Active Bases (Read-Only for transfers) |
| **Create/Edit Bases (`POST/PUT /api/bases`)** | Yes | No (403) | No (403) |
| **View Equipment (`GET /api/equipment`)** | Yes | Yes | Yes |
| **Create/Edit Equipment (`POST/PUT /api/equipment`)** | Yes | No (403) | No (403) |
| **View Purchases (`GET /api/purchases`)** | All Bases | Own Base Only | All Bases |
| **Create Purchase (`POST /api/purchases`)** | Yes | No (403) | Yes |
| **View Transfers (`GET /api/transfers`)** | All Bases | Involving Own Base Only | All Bases |
| **Initiate Transfer (`POST /api/transfers`)** | Yes | No (403) | Yes |
| **Approve / Reject Transfer (`PUT /api/transfers/:id/approve|reject`)** | Yes | Outgoing From Own Base Only | Policy-Configurable (Default: Yes for Logistics) |
| **Dispatch Transfer (`PUT /api/transfers/:id/dispatch`)** | Yes | Outgoing From Own Base Only | Yes |
| **Complete Transfer (`PUT /api/transfers/:id/complete`)** | Yes | Incoming To Own Base Only | Yes |
| **Cancel Transfer (`PUT /api/transfers/:id/cancel`)** | Yes | No (403) | Yes (Initiator / Logistics) |
| **View Assignments (`GET /api/assignments`)** | All Bases | Own Base Only | No (403) |
| **Create / Return Assignment (`POST/PUT /api/assignments`)** | Yes | Own Base Only | No (403) |
| **View Expenditures (`GET /api/expenditures`)** | All Bases | Own Base Only | No (403) |
| **Record Expenditure (`POST /api/expenditures`)** | Yes | Own Base Only | No (403) |
| **Administrative Stock Correction (`POST /api/dashboard/adjustments`)** | Yes (Audited) | No (403) | No (403) |
| **View Audit Logs (`GET /api/audit-logs`)** | All Records | Own Base Records Only | Logistics Records (`PURCHASE`, `TRANSFER`) |
| **User Management (`GET/POST/PUT/PATCH /api/users`)** | Yes | No (403) | No (403) |

## Base Isolation Enforcement Rules

1. `req.user` is populated from PostgreSQL (`id`, `username`, `role`, `baseId`, `isActive`) on every request after JWT verification.
2. Deactivated users (`isActive === false`) receive `401` / `403` and cannot use existing tokens.
3. For `BASE_COMMANDER`:
   - Any request targeting another `baseId` in route params, query string, or request body immediately returns `403 Forbidden`.
   - List queries without `baseId` are automatically filtered by `req.user.baseId`.
   - Record creation automatically forces `baseId = req.user.baseId`.
4. Logistics Officer permissions are centralized in `backend/src/config/policies.js` so global vs. home-base restrictions can be adjusted via configuration without code rewrites.

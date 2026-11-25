# Testing Guide — Military Asset Management System (MAMS)

## 1. Test Architecture

Backend integration tests run using **Vitest** and **Supertest** against a dedicated PostgreSQL test database (`TEST_DATABASE_URL`), completely isolated from development or production databases.

### Test Suites Covered
1. **Authentication (`auth.test.js`)**:
   - Valid login with HttpOnly refresh cookie & access token
   - Invalid password (`401`)
   - Unknown username (`401`)
   - Expired JWT (`401`)
   - Missing JWT (`401`)
   - Deactivated user rejected (`401`/`403`)
   - Token refresh and logout revocation
2. **Role-Based Access Control & Base Isolation (`rbac.test.js`)**:
   - Admin accesses global dashboard and all bases
   - Base Commander (`commander_alpha`) accesses Fort Alpha
   - Base Commander attempting to access another base via URL/query/body returns `403`
   - Base Commander attempting to override `baseId` on writes returns `403`
   - Logistics Officer accesses authorized purchase/transfer endpoints
   - Logistics Officer attempting user/base/equipment admin endpoints returns `403`
3. **Inventory Calculations (`inventory.test.js`)**:
   - Purchase increases inventory and closing balance
   - Pending transfer does NOT affect completed stock totals
   - Approved/In-Transit transfer reserves available stock without altering closing balance
   - Completed transfer decreases source (`Transfers Out`) and increases destination (`Transfers In`)
   - Assignment reduces available inventory; return restores it
   - Expenditure reduces available inventory
   - Negative stock prevented (`400`/`409`)
   - Historical date-range reports remain accurate after later transactions are added
4. **Transactions & Concurrency (`transferTransactions.test.js`)**:
   - Successful end-to-end transfer (`PENDING -> APPROVED -> IN_TRANSIT -> COMPLETED`)
   - Failed transfer / insufficient stock rollback leaves ledger untouched
   - Duplicate transfer completion prevented (`409`)
   - Concurrent stock deductions do not cause negative inventory
   - Unauthorized transfer transitions return `403`
5. **Audit Trail (`audit.test.js`)**:
   - Every successful inventory mutation creates an immutable audit record
   - Audit record captures authenticated `userId`, `previousValues`, and `newValues`
   - Failed operations do not create misleading success audit logs
   - Normal users cannot modify or delete audit history

## 2. Running Tests

```bash
cd backend
npm test
```

Make sure `TEST_DATABASE_URL` in `.env` or `.env.test` points to an empty/dedicated test PostgreSQL database, and run Prisma migrations against it before running tests (or let the test global setup sync the schema).

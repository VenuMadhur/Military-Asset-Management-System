# Database Schema — Military Asset Management System (MAMS)

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    Base ||--o{ User : "assigned to"
    Base ||--o{ Purchase : "receives"
    Base ||--o{ Transfer : "sourceBase"
    Base ||--o{ Transfer : "destinationBase"
    Base ||--o{ Assignment : "holds"
    Base ||--o{ Expenditure : "records"
    Base ||--o{ InventoryTransaction : "tracks"
    Base ||--o{ AuditLog : "scoped to"

    EquipmentType ||--o{ Purchase : "purchased as"
    EquipmentType ||--o{ Transfer : "transferred as"
    EquipmentType ||--o{ Assignment : "assigned as"
    EquipmentType ||--o{ Expenditure : "expended as"
    EquipmentType ||--o{ InventoryTransaction : "ledger for"

    User ||--o{ Purchase : "createdBy"
    User ||--o{ Transfer : "initiatedBy"
    User ||--o{ Transfer : "approvedBy"
    User ||--o{ Assignment : "createdBy"
    User ||--o{ Expenditure : "createdBy"
    User ||--o{ InventoryTransaction : "createdBy"
    User ||--o{ AuditLog : "actor"

    User {
        uuid id PK
        string username UK
        string passwordHash
        enum role
        uuid baseId FK
        boolean isActive
        string refreshTokenHash
        datetime createdAt
        datetime updatedAt
    }

    Base {
        uuid id PK
        string name UK
        string location
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    EquipmentType {
        uuid id PK
        string name UK
        enum category
        string description
        string unit
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Purchase {
        uuid id PK
        uuid baseId FK
        uuid equipmentTypeId FK
        int quantity
        datetime purchaseDate
        string referenceNumber UK
        string supplier
        string remarks
        uuid createdBy FK
        datetime createdAt
    }

    Transfer {
        uuid id PK
        uuid sourceBaseId FK
        uuid destinationBaseId FK
        uuid equipmentTypeId FK
        int quantity
        enum status
        string referenceNumber UK
        string remarks
        uuid initiatedBy FK
        uuid approvedBy FK
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }

    Assignment {
        uuid id PK
        uuid baseId FK
        uuid equipmentTypeId FK
        int quantity
        string assignedTo
        datetime assignmentDate
        enum status
        string remarks
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
    }

    Expenditure {
        uuid id PK
        uuid baseId FK
        uuid equipmentTypeId FK
        int quantity
        datetime expenditureDate
        string reason
        string referenceNumber UK
        string remarks
        uuid createdBy FK
        datetime createdAt
    }

    InventoryTransaction {
        uuid id PK
        uuid baseId FK
        uuid equipmentTypeId FK
        enum transactionType
        int quantity
        string referenceType
        uuid referenceId
        datetime occurredAt
        uuid createdBy FK
        datetime createdAt
    }

    AuditLog {
        uuid id PK
        uuid userId FK
        string action
        string entityType
        string entityId
        uuid baseId FK
        json previousValues
        json newValues
        string details
        string ipAddress
        datetime createdAt
    }
```

## 2. Enums & Constraints

- **Role**: `ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER`
- **EquipmentCategory**: `VEHICLE`, `WEAPON`, `AMMUNITION`, `OTHER`
- **TransferStatus**: `PENDING`, `APPROVED`, `IN_TRANSIT`, `COMPLETED`, `REJECTED`, `CANCELLED`
- **AssignmentStatus**: `ACTIVE`, `RETURNED`
- **TransactionType**: `PURCHASE`, `TRANSFER_IN`, `TRANSFER_OUT`, `ASSIGNMENT`, `ASSIGNMENT_RETURN`, `EXPENDITURE`, `ADJUSTMENT`
- **PostgreSQL CHECK Constraints** (enforced in SQL migration):
  - `purchases.quantity > 0`
  - `transfers.quantity > 0` AND `transfers.source_base_id <> transfers.destination_base_id`
  - `assignments.quantity > 0`
  - `expenditures.quantity > 0`
  - `inventory_transactions.quantity <> 0`

## 3. Stock Reservation & Ledger Rules

1. **Completed Balance (Physical On-Hand)**: Sum of `InventoryTransaction.quantity` for `(baseId, equipmentTypeId)` up to a given timestamp.
2. **Reserved Stock**: Sum of `Transfer.quantity` where `sourceBaseId = baseId`, `equipmentTypeId = equipmentTypeId`, and `status IN ('APPROVED', 'IN_TRANSIT')`.
3. **Available Stock**: `Completed Balance - Reserved Stock`. Must always remain `>= 0`.
4. **Pending Transfers**: Do not reserve or modify stock. Available stock is still validated at initiation and re-validated at approval inside a transaction lock.
5. **Completion Atomicity**: Transitioning `IN_TRANSIT -> COMPLETED` (or `APPROVED -> COMPLETED` if allowed? Workflow requires `PENDING -> APPROVED -> IN_TRANSIT -> COMPLETED`!) writes `TRANSFER_OUT` (`-quantity`) at `sourceBaseId` and `TRANSFER_IN` (`+quantity`) at `destinationBaseId` with the same `completedAt` timestamp inside a single `prisma.$transaction`.

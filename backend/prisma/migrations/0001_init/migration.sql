-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('VEHICLE', 'WEAPON', 'AMMUNITION', 'OTHER');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ASSIGNMENT', 'ASSIGNMENT_RETURN', 'EXPENDITURE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "bases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "Role" NOT NULL,
    "base_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UNITS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "reference_number" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "remarks" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "source_base_id" TEXT NOT NULL,
    "destination_base_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "reference_number" TEXT NOT NULL,
    "remarks" TEXT,
    "initiated_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "assignment_date" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "returned_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenditures" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expenditure_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "remarks" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenditures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "base_id" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "base_id" TEXT,
    "previous_values" JSONB,
    "new_values" JSONB,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bases_name_key" ON "bases"("name");

-- CreateIndex
CREATE INDEX "bases_is_active_idx" ON "bases"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_base_id_idx" ON "users"("base_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_types_name_key" ON "equipment_types"("name");

-- CreateIndex
CREATE INDEX "equipment_types_category_idx" ON "equipment_types"("category");

-- CreateIndex
CREATE INDEX "equipment_types_is_active_idx" ON "equipment_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_reference_number_key" ON "purchases"("reference_number");

-- CreateIndex
CREATE INDEX "purchases_base_id_equipment_type_id_idx" ON "purchases"("base_id", "equipment_type_id");

-- CreateIndex
CREATE INDEX "purchases_purchase_date_idx" ON "purchases"("purchase_date");

-- CreateIndex
CREATE INDEX "purchases_created_by_idx" ON "purchases"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_reference_number_key" ON "transfers"("reference_number");

-- CreateIndex
CREATE INDEX "transfers_source_base_id_status_idx" ON "transfers"("source_base_id", "status");

-- CreateIndex
CREATE INDEX "transfers_destination_base_id_status_idx" ON "transfers"("destination_base_id", "status");

-- CreateIndex
CREATE INDEX "transfers_equipment_type_id_idx" ON "transfers"("equipment_type_id");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfers_completed_at_idx" ON "transfers"("completed_at");

-- CreateIndex
CREATE INDEX "assignments_base_id_equipment_type_id_idx" ON "assignments"("base_id", "equipment_type_id");

-- CreateIndex
CREATE INDEX "assignments_assignment_date_idx" ON "assignments"("assignment_date");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "expenditures_reference_number_key" ON "expenditures"("reference_number");

-- CreateIndex
CREATE INDEX "expenditures_base_id_equipment_type_id_idx" ON "expenditures"("base_id", "equipment_type_id");

-- CreateIndex
CREATE INDEX "expenditures_expenditure_date_idx" ON "expenditures"("expenditure_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_base_id_equipment_type_id_occurred_a_idx" ON "inventory_transactions"("base_id", "equipment_type_id", "occurred_at");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_type_occurred_at_idx" ON "inventory_transactions"("transaction_type", "occurred_at");

-- CreateIndex
CREATE INDEX "inventory_transactions_reference_type_reference_id_idx" ON "inventory_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_base_id_created_at_idx" ON "audit_logs"("base_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_source_base_id_fkey" FOREIGN KEY ("source_base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destination_base_id_fkey" FOREIGN KEY ("destination_base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integrity Check Constraints
ALTER TABLE "purchases" ADD CONSTRAINT "chk_purchases_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "transfers" ADD CONSTRAINT "chk_transfers_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "transfers" ADD CONSTRAINT "chk_transfers_distinct_bases" CHECK ("source_base_id" <> "destination_base_id");
ALTER TABLE "assignments" ADD CONSTRAINT "chk_assignments_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "expenditures" ADD CONSTRAINT "chk_expenditures_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "chk_inventory_tx_nonzero" CHECK ("quantity" <> 0);

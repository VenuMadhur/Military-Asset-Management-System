import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(backendRoot, '.env') });
  dotenv.config({ path: path.join(backendRoot, '.env.development'), override: false });
} else {
  dotenv.config();
}

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Development seed script must NEVER run in production. Use createProductionAdmin.js instead.'
    );
  }

  if (String(process.env.SEED_ENABLE_DEV_ACCOUNTS).toLowerCase() !== 'true') {
    throw new Error(
      'SEED_ENABLE_DEV_ACCOUNTS must be set to "true" in your development .env to seed demo accounts.'
    );
  }

  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const commanderUsername = process.env.SEED_COMMANDER_USERNAME;
  const commanderPassword = process.env.SEED_COMMANDER_PASSWORD;
  const logisticsUsername = process.env.SEED_LOGISTICS_USERNAME;
  const logisticsPassword = process.env.SEED_LOGISTICS_PASSWORD;

  if (
    !adminUsername ||
    !adminPassword ||
    !commanderUsername ||
    !commanderPassword ||
    !logisticsUsername ||
    !logisticsPassword
  ) {
    throw new Error(
      'Missing SEED_* credential environment variables. Check backend/.env or backend/.env.development.'
    );
  }

  console.log('Seeding MAMS development database...');

  // 1. Seed Bases
  const fortAlpha = await prisma.base.upsert({
    where: { name: 'Fort Alpha' },
    update: {},
    create: {
      name: 'Fort Alpha',
      location: 'Northern Sector HQ',
      description: 'Primary northern logistics and garrison installation (Base #1)',
      isActive: true,
    },
  });

  const fortBravo = await prisma.base.upsert({
    where: { name: 'Fort Bravo' },
    update: {},
    create: {
      name: 'Fort Bravo',
      location: 'Eastern Command Depot',
      description: 'Regional supply hub and vehicle maintenance depot',
      isActive: true,
    },
  });

  const campCharlie = await prisma.base.upsert({
    where: { name: 'Camp Charlie' },
    update: {},
    create: {
      name: 'Camp Charlie',
      location: 'Southern Training Grounds',
      description: 'Field readiness and training operations facility',
      isActive: true,
    },
  });

  // 2. Seed Users
  const [adminHash, commanderHash, logisticsHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(commanderPassword, 12),
    bcrypt.hash(logisticsPassword, 12),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { passwordHash: adminHash, role: 'ADMIN', isActive: true },
    create: {
      username: adminUsername,
      passwordHash: adminHash,
      fullName: 'HQ System Administrator',
      role: 'ADMIN',
      baseId: null,
      isActive: true,
    },
  });

  const commanderAlpha = await prisma.user.upsert({
    where: { username: commanderUsername },
    update: { passwordHash: commanderHash, role: 'BASE_COMMANDER', baseId: fortAlpha.id, isActive: true },
    create: {
      username: commanderUsername,
      passwordHash: commanderHash,
      fullName: 'Commander Fort Alpha',
      role: 'BASE_COMMANDER',
      baseId: fortAlpha.id,
      isActive: true,
    },
  });

  const logisticsOfficer = await prisma.user.upsert({
    where: { username: logisticsUsername },
    update: { passwordHash: logisticsHash, role: 'LOGISTICS_OFFICER', baseId: fortAlpha.id, isActive: true },
    create: {
      username: logisticsUsername,
      passwordHash: logisticsHash,
      fullName: 'Central Logistics Officer',
      role: 'LOGISTICS_OFFICER',
      baseId: fortAlpha.id,
      isActive: true,
    },
  });

  // 3. Seed Equipment Types
  const equipmentCatalog = [
    {
      name: 'Tactical Transport Truck 4x4',
      category: 'VEHICLE',
      description: 'Heavy-duty utility troop and cargo transport vehicle',
      unit: 'UNITS',
    },
    {
      name: 'Armored Utility Carrier',
      category: 'VEHICLE',
      description: 'Protected logistics and personnel transport carrier',
      unit: 'UNITS',
    },
    {
      name: 'Service Carbine M4-A1',
      category: 'WEAPON',
      description: 'Standard issue modular service carbine',
      unit: 'UNITS',
    },
    {
      name: 'Standard Sidearm 9mm',
      category: 'WEAPON',
      description: 'Standard duty sidearm for garrison personnel',
      unit: 'UNITS',
    },
    {
      name: '5.56mm Ball Ammunition Crate',
      category: 'AMMUNITION',
      description: 'Sealed 1,000-round training and readiness crate',
      unit: 'CRATES',
    },
    {
      name: 'Encrypted Field Radio Set',
      category: 'OTHER',
      description: 'Portable UHF/VHF logistics communications unit',
      unit: 'SETS',
    },
  ];

  const equipmentMap = {};
  for (const item of equipmentCatalog) {
    const eq = await prisma.equipmentType.upsert({
      where: { name: item.name },
      update: {},
      create: { ...item, isActive: true },
    });
    equipmentMap[item.name] = eq;
  }

  // 4. Seed Initial Transactions if database has no purchases yet
  const existingPurchaseCount = await prisma.purchase.count();
  if (existingPurchaseCount === 0) {
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const truck = equipmentMap['Tactical Transport Truck 4x4'];
    const carrier = equipmentMap['Armored Utility Carrier'];
    const carbine = equipmentMap['Service Carbine M4-A1'];
    const ammo = equipmentMap['5.56mm Ball Ammunition Crate'];
    const radio = equipmentMap['Encrypted Field Radio Set'];

    const initialPurchases = [
      {
        baseId: fortAlpha.id,
        equipmentTypeId: truck.id,
        quantity: 30,
        purchaseDate: daysAgo(45),
        referenceNumber: 'PO-DEV-2026-001',
        supplier: 'Defense Mobility Corp',
        remarks: 'Initial fleet allocation for Fort Alpha',
        createdBy: logisticsOfficer.id,
      },
      {
        baseId: fortAlpha.id,
        equipmentTypeId: carbine.id,
        quantity: 120,
        purchaseDate: daysAgo(40),
        referenceNumber: 'PO-DEV-2026-002',
        supplier: 'National Ordnance Works',
        remarks: 'Standard armory replenishment',
        createdBy: logisticsOfficer.id,
      },
      {
        baseId: fortAlpha.id,
        equipmentTypeId: ammo.id,
        quantity: 200,
        purchaseDate: daysAgo(35),
        referenceNumber: 'PO-DEV-2026-003',
        supplier: 'Allied Munitions Ltd',
        remarks: 'Quarterly training allocation',
        createdBy: adminUser.id,
      },
      {
        baseId: fortBravo.id,
        equipmentTypeId: carrier.id,
        quantity: 18,
        purchaseDate: daysAgo(30),
        referenceNumber: 'PO-DEV-2026-004',
        supplier: 'Defense Mobility Corp',
        remarks: 'Eastern depot armored stock',
        createdBy: logisticsOfficer.id,
      },
      {
        baseId: fortAlpha.id,
        equipmentTypeId: radio.id,
        quantity: 50,
        purchaseDate: daysAgo(12),
        referenceNumber: 'PO-DEV-2026-005',
        supplier: 'SignalTech Systems',
        remarks: 'Communications modernization batch',
        createdBy: logisticsOfficer.id,
      },
    ];

    for (const p of initialPurchases) {
      const created = await prisma.purchase.create({ data: p });
      await prisma.inventoryTransaction.create({
        data: {
          baseId: p.baseId,
          equipmentTypeId: p.equipmentTypeId,
          transactionType: 'PURCHASE',
          quantity: p.quantity,
          referenceType: 'PURCHASE',
          referenceId: created.id,
          occurredAt: p.purchaseDate,
          createdBy: p.createdBy,
        },
      });
    }

    // Completed Transfer: Fort Alpha -> Fort Bravo (10 Tactical Trucks)
    const completedTransferDate = daysAgo(10);
    const completedTransfer = await prisma.transfer.create({
      data: {
        sourceBaseId: fortAlpha.id,
        destinationBaseId: fortBravo.id,
        equipmentTypeId: truck.id,
        quantity: 10,
        status: 'COMPLETED',
        referenceNumber: 'TRF-DEV-2026-001',
        remarks: 'Rebalancing transport trucks to Fort Bravo',
        initiatedBy: logisticsOfficer.id,
        approvedBy: adminUser.id,
        completedAt: completedTransferDate,
      },
    });
    await prisma.inventoryTransaction.createMany({
      data: [
        {
          baseId: fortAlpha.id,
          equipmentTypeId: truck.id,
          transactionType: 'TRANSFER_OUT',
          quantity: -10,
          referenceType: 'TRANSFER',
          referenceId: completedTransfer.id,
          occurredAt: completedTransferDate,
          createdBy: adminUser.id,
        },
        {
          baseId: fortBravo.id,
          equipmentTypeId: truck.id,
          transactionType: 'TRANSFER_IN',
          quantity: 10,
          referenceType: 'TRANSFER',
          referenceId: completedTransfer.id,
          occurredAt: completedTransferDate,
          createdBy: adminUser.id,
        },
      ],
    });

    // Pending Transfer: Fort Alpha -> Camp Charlie (5 Radios)
    await prisma.transfer.create({
      data: {
        sourceBaseId: fortAlpha.id,
        destinationBaseId: campCharlie.id,
        equipmentTypeId: radio.id,
        quantity: 5,
        status: 'PENDING',
        referenceNumber: 'TRF-DEV-2026-002',
        remarks: 'Awaiting approval for Camp Charlie exercise',
        initiatedBy: logisticsOfficer.id,
      },
    });

    // Assignment at Fort Alpha (25 Carbines)
    const assignDate = daysAgo(7);
    const assignment = await prisma.assignment.create({
      data: {
        baseId: fortAlpha.id,
        equipmentTypeId: carbine.id,
        quantity: 25,
        assignedTo: '1st Garrison Platoon',
        assignmentDate: assignDate,
        status: 'ACTIVE',
        remarks: 'Standard garrison duty issue',
        createdBy: commanderAlpha.id,
      },
    });
    await prisma.inventoryTransaction.create({
      data: {
        baseId: fortAlpha.id,
        equipmentTypeId: carbine.id,
        transactionType: 'ASSIGNMENT',
        quantity: -25,
        referenceType: 'ASSIGNMENT',
        referenceId: assignment.id,
        occurredAt: assignDate,
        createdBy: commanderAlpha.id,
      },
    });

    // Expenditure at Fort Alpha (30 Ammo Crates)
    const expDate = daysAgo(4);
    const expenditure = await prisma.expenditure.create({
      data: {
        baseId: fortAlpha.id,
        equipmentTypeId: ammo.id,
        quantity: 30,
        expenditureDate: expDate,
        reason: 'Annual qualification range training',
        referenceNumber: 'EXP-DEV-2026-001',
        remarks: 'Consumed during Q4 readiness qualification',
        createdBy: commanderAlpha.id,
      },
    });
    await prisma.inventoryTransaction.create({
      data: {
        baseId: fortAlpha.id,
        equipmentTypeId: ammo.id,
        transactionType: 'EXPENDITURE',
        quantity: -30,
        referenceType: 'EXPENDITURE',
        referenceId: expenditure.id,
        occurredAt: expDate,
        createdBy: commanderAlpha.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'DEV_DATABASE_SEEDED',
        entityType: 'SYSTEM',
        entityId: 'SEED',
        baseId: null,
        details: 'Initialized development seed data for Fort Alpha, Fort Bravo, and Camp Charlie',
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

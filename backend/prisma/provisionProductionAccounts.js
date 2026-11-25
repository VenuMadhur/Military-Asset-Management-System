import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const NON_PROD_BRANCH_IDS = new Set([
  'br-round-pine-bi5as382', // mams-dev
  'br-dry-hall-bi558hip',  // mams-test
]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function requireStrongPassword(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (value.length < 12) {
    throw new Error(`${name} must be at least 12 characters long.`);
  }
  return value;
}

async function verifyProductionBranch() {
  const expectedBranchId = requireEnv('EXPECTED_PROD_BRANCH_ID');

  if (NON_PROD_BRANCH_IDS.has(expectedBranchId)) {
    throw new Error(
      `EXPECTED_PROD_BRANCH_ID (${expectedBranchId}) matches a known dev/test branch; refusing to continue.`
    );
  }

  const branchMeta = await prisma.$queryRawUnsafe(
    "SELECT current_setting('neon.branch_id', true) AS branch_id, current_setting('neon.endpoint_id', true) AS endpoint_id"
  );
  const actualBranchId = branchMeta?.[0]?.branch_id || null;
  const actualEndpointId = branchMeta?.[0]?.endpoint_id || null;

  if (!actualBranchId) {
    throw new Error(
      'Unable to read neon.branch_id from connected database; refusing to treat an unverified database as production.'
    );
  }

  if (NON_PROD_BRANCH_IDS.has(actualBranchId)) {
    throw new Error(
      `Connected database is a dev/test Neon branch (${actualBranchId}); refusing to provision production accounts.`
    );
  }

  if (actualBranchId !== expectedBranchId) {
    throw new Error(
      `Neon branch mismatch: expected ${expectedBranchId}, but connected to ${actualBranchId}.`
    );
  }

  return { branchId: actualBranchId, endpointId: actualEndpointId };
}

async function main() {
  const adminUsername = requireEnv('PROD_ADMIN_USERNAME');
  const adminPassword = requireStrongPassword('PROD_ADMIN_PASSWORD');
  const commanderUsername = requireEnv('PROD_COMMANDER_USERNAME');
  const commanderPassword = requireStrongPassword('PROD_COMMANDER_PASSWORD');
  const logisticsUsername = requireEnv('PROD_LOGISTICS_USERNAME');
  const logisticsPassword = requireStrongPassword('PROD_LOGISTICS_PASSWORD');

  const uniqueUsernames = new Set([adminUsername, commanderUsername, logisticsUsername]);
  if (uniqueUsernames.size !== 3) {
    throw new Error('Admin, Base Commander, and Logistics Officer usernames must be distinct.');
  }

  const verifiedTarget = await verifyProductionBranch();

  const [adminHash, commanderHash, logisticsHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(commanderPassword, 12),
    bcrypt.hash(logisticsPassword, 12),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    // Abort safely before any user creation if any target account already exists
    const existingUsers = await tx.user.findMany({
      where: { username: { in: [adminUsername, commanderUsername, logisticsUsername] } },
      select: { id: true, username: true, role: true, baseId: true, isActive: true },
    });

    if (existingUsers.length > 0) {
      const conflicts = existingUsers
        .map((u) => `${u.username} (role=${u.role}, isActive=${u.isActive})`)
        .join(', ');
      throw new Error(
        `Account conflict detected; refusing to overwrite existing users: ${conflicts}`
      );
    }

    // Ensure minimum required reference bases exist without modifying existing records
    const fortAlpha = await tx.base.upsert({
      where: { name: 'Fort Alpha' },
      update: {},
      create: {
        name: 'Fort Alpha',
        location: 'Northern Sector HQ',
        description: 'Primary garrison installation (Base #1)',
        isActive: true,
      },
    });

    await tx.base.upsert({
      where: { name: 'Fort Bravo' },
      update: {},
      create: {
        name: 'Fort Bravo',
        location: 'Eastern Command Depot',
        description: 'Secondary installation for inter-base logistics operations',
        isActive: true,
      },
    });

    // Ensure minimum reference equipment catalog exists if empty (no demo transactions)
    const existingEquipmentCount = await tx.equipmentType.count();
    if (existingEquipmentCount === 0) {
      const minimalCatalog = [
        {
          name: 'Tactical Transport Truck 4x4',
          category: 'VEHICLE',
          description: 'Utility logistics transport vehicle',
          unit: 'UNITS',
        },
        {
          name: 'Service Carbine M4-A1',
          category: 'WEAPON',
          description: 'Standard issue service carbine',
          unit: 'UNITS',
        },
        {
          name: '5.56mm Ball Ammunition Crate',
          category: 'AMMUNITION',
          description: 'Standard sealed ammunition crate',
          unit: 'CRATES',
        },
        {
          name: 'Encrypted Field Radio Set',
          category: 'OTHER',
          description: 'Portable communications unit',
          unit: 'SETS',
        },
      ];

      for (const eq of minimalCatalog) {
        await tx.equipmentType.upsert({
          where: { name: eq.name },
          update: {},
          create: { ...eq, isActive: true },
        });
      }
    }

    const adminUser = await tx.user.create({
      data: {
        username: adminUsername,
        passwordHash: adminHash,
        fullName: 'HQ System Administrator',
        role: 'ADMIN',
        baseId: null,
        isActive: true,
      },
      select: { id: true, username: true, role: true, baseId: true, isActive: true },
    });

    const commanderAlpha = await tx.user.create({
      data: {
        username: commanderUsername,
        passwordHash: commanderHash,
        fullName: 'Commander Fort Alpha',
        role: 'BASE_COMMANDER',
        baseId: fortAlpha.id,
        isActive: true,
      },
      select: { id: true, username: true, role: true, baseId: true, isActive: true },
    });

    const logisticsOfficer = await tx.user.create({
      data: {
        username: logisticsUsername,
        passwordHash: logisticsHash,
        fullName: 'Central Logistics Officer',
        role: 'LOGISTICS_OFFICER',
        baseId: fortAlpha.id,
        isActive: true,
      },
      select: { id: true, username: true, role: true, baseId: true, isActive: true },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'PROD_ACCOUNTS_PROVISIONED',
        entityType: 'SYSTEM',
        entityId: 'PROVISION',
        baseId: null,
        details: `Provisioned production accounts (${adminUser.username}, ${commanderAlpha.username}, ${logisticsOfficer.username}) on verified Neon branch ${verifiedTarget.branchId}.`,
      },
    });

    return { fortAlphaId: fortAlpha.id, accounts: [adminUser, commanderAlpha, logisticsOfficer] };
  });

  console.log('Production accounts provisioned safely:', {
    verifiedBranchId: verifiedTarget.branchId,
    verifiedEndpointId: verifiedTarget.endpointId,
    fortAlphaId: result.fortAlphaId,
    accounts: result.accounts,
  });
}

main()
  .catch((err) => {
    console.error('Production account provisioning failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

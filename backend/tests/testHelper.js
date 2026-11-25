import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import env from '../src/config/env.js';

let testIsolationVerified = false;

async function assertTestDatabaseIsolation() {
  if (testIsolationVerified) return;
  if (process.env.NODE_ENV !== 'test' || !env.isTest) {
    throw new Error('Tests must execute with NODE_ENV=test');
  }
  if (!process.env.TEST_DATABASE_URL || env.databaseUrl !== process.env.TEST_DATABASE_URL) {
    throw new Error('Test runner is not configured to use TEST_DATABASE_URL');
  }
  if (process.env.DATABASE_URL) {
    const devHost = new URL(process.env.DATABASE_URL).hostname.split('.')[0].replace('-pooler', '');
    const testHost = new URL(env.databaseUrl).hostname.split('.')[0].replace('-pooler', '');
    if (devHost === testHost) {
      throw new Error('Refusing to run tests: TEST_DATABASE_URL shares an endpoint with DATABASE_URL');
    }
  }
  testIsolationVerified = true;
}

export async function resetTestDatabase() {
  await assertTestDatabaseIsolation();
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.inventoryTransaction.deleteMany(),
    prisma.expenditure.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.user.deleteMany(),
    prisma.equipmentType.deleteMany(),
    prisma.base.deleteMany(),
  ]);
}

export async function seedTestFixtures() {
  const [fortAlpha, fortBravo, campCharlie] = await Promise.all([
    prisma.base.create({
      data: { name: 'Fort Alpha', location: 'Sector 1', isActive: true },
    }),
    prisma.base.create({
      data: { name: 'Fort Bravo', location: 'Sector 2', isActive: true },
    }),
    prisma.base.create({
      data: { name: 'Camp Charlie', location: 'Sector 3', isActive: true },
    }),
  ]);

  const [truck, rifle, ammo] = await Promise.all([
    prisma.equipmentType.create({
      data: { name: 'Transport Truck', category: 'VEHICLE', unit: 'UNITS', isActive: true },
    }),
    prisma.equipmentType.create({
      data: { name: 'Service Rifle', category: 'WEAPON', unit: 'UNITS', isActive: true },
    }),
    prisma.equipmentType.create({
      data: { name: '5.56mm Crate', category: 'AMMUNITION', unit: 'CRATES', isActive: true },
    }),
  ]);

  const [adminHash, commanderHash, logisticsHash] = await Promise.all([
    bcrypt.hash('AdminPass123!', 10),
    bcrypt.hash('CommandPass123!', 10),
    bcrypt.hash('LogisticsPass123!', 10),
  ]);

  const [adminUser, commanderAlpha, logisticsOfficer] = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin_user',
        passwordHash: adminHash,
        fullName: 'Admin User',
        role: 'ADMIN',
        baseId: null,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'commander_alpha',
        passwordHash: commanderHash,
        fullName: 'Commander Alpha',
        role: 'BASE_COMMANDER',
        baseId: fortAlpha.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'logistics_officer',
        passwordHash: logisticsHash,
        fullName: 'Logistics Officer',
        role: 'LOGISTICS_OFFICER',
        baseId: fortAlpha.id,
        isActive: true,
      },
    }),
  ]);

  return {
    bases: { fortAlpha, fortBravo, campCharlie },
    equipment: { truck, rifle, ammo },
    users: { adminUser, commanderAlpha, logisticsOfficer },
  };
}

export async function loginAs(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return {
    status: res.status,
    token: res.body?.data?.accessToken,
    user: res.body?.data?.user,
    cookies: res.headers['set-cookie'],
  };
}

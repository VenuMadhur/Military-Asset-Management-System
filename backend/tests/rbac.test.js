import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { loginAs, resetTestDatabase, seedTestFixtures } from './testHelper.js';

describe('Role-Based Access Control & Base Isolation', () => {
  let fixtures;
  let adminToken;
  let commanderToken;
  let logisticsToken;

  beforeEach(async () => {
    await resetTestDatabase();
    fixtures = await seedTestFixtures();

    adminToken = (await loginAs('admin_user', 'AdminPass123!')).token;
    commanderToken = (await loginAs('commander_alpha', 'CommandPass123!')).token;
    logisticsToken = (await loginAs('logistics_officer', 'LogisticsPass123!')).token;

    // Seed stock at Fort Alpha & Fort Bravo
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseId: fixtures.bases.fortAlpha.id,
        equipmentTypeId: fixtures.equipment.rifle.id,
        quantity: 50,
        purchaseDate: '2026-10-01T00:00:00.000Z',
        referenceNumber: 'PO-RBAC-001',
        supplier: 'Defense Corp',
      });

    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 20,
        purchaseDate: '2026-10-01T00:00:00.000Z',
        referenceNumber: 'PO-RBAC-002',
        supplier: 'Mobility Inc',
      });
  });

  it('allows Admin to access global dashboard and all bases', async () => {
    const summaryRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.purchases).toBe(70);

    const basesRes = await request(app)
      .get('/api/bases')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(basesRes.status).toBe(200);
    expect(basesRes.body.data.length).toBe(3);
  });

  it('restricts Base Commander to Fort Alpha only', async () => {
    const summaryRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${commanderToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.purchases).toBe(50);

    const basesRes = await request(app)
      .get('/api/bases')
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(basesRes.status).toBe(200);
    expect(basesRes.body.data.length).toBe(1);
    expect(basesRes.body.data[0].id).toBe(fixtures.bases.fortAlpha.id);
  });

  it('forbids Base Commander from accessing another base via URL or query param', async () => {
    const baseByIdRes = await request(app)
      .get(`/api/bases/${fixtures.bases.fortBravo.id}`)
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(baseByIdRes.status).toBe(403);

    const dashboardQueryRes = await request(app)
      .get(`/api/dashboard/summary?baseId=${fixtures.bases.fortBravo.id}`)
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(dashboardQueryRes.status).toBe(403);

    const inventoryQueryRes = await request(app)
      .get(`/api/dashboard/inventory?baseId=${fixtures.bases.fortBravo.id}`)
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(inventoryQueryRes.status).toBe(403);
  });

  it('forbids Base Commander from overriding baseId in request body on assignments or expenditures', async () => {
    const assignRes = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        baseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.rifle.id,
        quantity: 5,
        assignedTo: 'Squad 1',
        assignmentDate: '2026-10-02T00:00:00.000Z',
      });
    expect(assignRes.status).toBe(403);

    const expRes = await request(app)
      .post('/api/expenditures')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        baseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.rifle.id,
        quantity: 2,
        expenditureDate: '2026-10-02T00:00:00.000Z',
        reason: 'Test',
        referenceNumber: 'EXP-RBAC-001',
      });
    expect(expRes.status).toBe(403);
  });

  it('allows Logistics Officer authorized logistics operations but denies user/base/equipment admin', async () => {
    const purchaseRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        baseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.ammo.id,
        quantity: 15,
        purchaseDate: '2026-10-03T00:00:00.000Z',
        referenceNumber: 'PO-RBAC-003',
        supplier: 'Munitions Corp',
      });
    expect(purchaseRes.status).toBe(201);

    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${logisticsToken}`);
    expect(usersRes.status).toBe(403);

    const createBaseRes = await request(app)
      .post('/api/bases')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({ name: 'Unauthorized Base', location: 'Nowhere' });
    expect(createBaseRes.status).toBe(403);

    const createEquipRes = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({ name: 'Unauthorized Item', category: 'OTHER', unit: 'UNITS' });
    expect(createEquipRes.status).toBe(403);
  });
});

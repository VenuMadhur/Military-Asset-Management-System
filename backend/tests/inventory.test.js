import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { loginAs, resetTestDatabase, seedTestFixtures } from './testHelper.js';

describe('Inventory Calculation Engine', () => {
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
  });

  it('accurately computes opening, net movement, assigned, expended, closing, and historical balances', async () => {
    const alphaId = fixtures.bases.fortAlpha.id;
    const bravoId = fixtures.bases.fortBravo.id;
    const ammoId = fixtures.equipment.ammo.id;

    // Day 1 (Oct 1): Purchase 100 crates at Fort Alpha
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        baseId: alphaId,
        equipmentTypeId: ammoId,
        quantity: 100,
        purchaseDate: '2026-10-01T10:00:00.000Z',
        referenceNumber: 'PO-INV-001',
        supplier: 'Allied Munitions',
      });

    // Day 10 (Oct 10): Purchase 40 crates at Fort Alpha
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        baseId: alphaId,
        equipmentTypeId: ammoId,
        quantity: 40,
        purchaseDate: '2026-10-10T10:00:00.000Z',
        referenceNumber: 'PO-INV-002',
        supplier: 'Allied Munitions',
      });

    // Day 12 (Oct 12): Assign 20 crates at Fort Alpha
    const assignRes = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        equipmentTypeId: ammoId,
        quantity: 20,
        assignedTo: 'Range Detachment',
        assignmentDate: '2026-10-12T10:00:00.000Z',
      });
    expect(assignRes.status).toBe(201);

    // Day 15 (Oct 15): Expend 15 crates at Fort Alpha
    const expRes = await request(app)
      .post('/api/expenditures')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        equipmentTypeId: ammoId,
        quantity: 15,
        expenditureDate: '2026-10-15T10:00:00.000Z',
        reason: 'Live fire qualification',
        referenceNumber: 'EXP-INV-001',
      });
    expect(expRes.status).toBe(201);

    // Initiate PENDING transfer of 30 crates Alpha -> Bravo
    const trfRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: alphaId,
        destinationBaseId: bravoId,
        equipmentTypeId: ammoId,
        quantity: 30,
        referenceNumber: 'TRF-INV-001',
      });
    expect(trfRes.status).toBe(201);
    const transferId = trfRes.body.data.id;

    // Pending transfer must NOT alter completed totals
    let alphaSummary = await request(app)
      .get(`/api/dashboard/summary?baseId=${alphaId}&equipmentTypeId=${ammoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alphaSummary.body.data.closingBalance).toBe(105); // 100 + 40 - 20 - 15
    expect(alphaSummary.body.data.availableQuantity).toBe(105);

    // Approve transfer -> reserves 30 units (closing remains 105, available drops to 75)
    await request(app)
      .put(`/api/transfers/${transferId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    alphaSummary = await request(app)
      .get(`/api/dashboard/summary?baseId=${alphaId}&equipmentTypeId=${ammoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alphaSummary.body.data.closingBalance).toBe(105);
    expect(alphaSummary.body.data.reservedQuantity).toBe(30);
    expect(alphaSummary.body.data.availableQuantity).toBe(75);

    // Attempting expenditure > available (75) must be prevented
    const overExpRes = await request(app)
      .post('/api/expenditures')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        equipmentTypeId: ammoId,
        quantity: 80,
        expenditureDate: '2026-10-16T10:00:00.000Z',
        reason: 'Overdraw check',
        referenceNumber: 'EXP-INV-OVER',
      });
    expect(overExpRes.status).toBe(400);

    // Dispatch & Complete transfer
    await request(app)
      .put(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({});
    await request(app)
      .put(`/api/transfers/${transferId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    alphaSummary = await request(app)
      .get(`/api/dashboard/summary?baseId=${alphaId}&equipmentTypeId=${ammoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alphaSummary.body.data.transfersOut).toBe(30);
    expect(alphaSummary.body.data.closingBalance).toBe(75);
    expect(alphaSummary.body.data.reservedQuantity).toBe(0);
    expect(alphaSummary.body.data.availableQuantity).toBe(75);

    const bravoSummary = await request(app)
      .get(`/api/dashboard/summary?baseId=${bravoId}&equipmentTypeId=${ammoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(bravoSummary.body.data.transfersIn).toBe(30);
    expect(bravoSummary.body.data.closingBalance).toBe(30);

    // Historical report for Oct 05 - Oct 14:
    // Opening (before Oct 05) = 100
    // Period (Oct 05 - Oct 14): Purchases = 40, Assigned = 20, Expended = 0, Transfers = 0
    // Closing as of Oct 14 = 100 + 40 - 20 = 120 (unaffected by Oct 15 expenditure & later transfer!)
    const historicalRes = await request(app)
      .get(
        `/api/dashboard/summary?baseId=${alphaId}&equipmentTypeId=${ammoId}&startDate=2026-10-05&endDate=2026-10-14`
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historicalRes.status).toBe(200);
    expect(historicalRes.body.data.openingBalance).toBe(100);
    expect(historicalRes.body.data.purchases).toBe(40);
    expect(historicalRes.body.data.assigned).toBe(20);
    expect(historicalRes.body.data.expended).toBe(0);
    expect(historicalRes.body.data.closingBalance).toBe(120);
  });
});

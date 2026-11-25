import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { loginAs, resetTestDatabase, seedTestFixtures } from './testHelper.js';

describe('Transfer Transactions & Concurrency Control', () => {
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

    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseId: fixtures.bases.fortAlpha.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 10,
        purchaseDate: '2026-10-01T00:00:00.000Z',
        referenceNumber: 'PO-TRF-001',
        supplier: 'Mobility Corp',
      });
  });

  it('prevents same-base transfer, zero/negative quantities, and insufficient stock transfers', async () => {
    const sameBase = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortAlpha.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 2,
        referenceNumber: 'TRF-ERR-1',
      });
    expect(sameBase.status).toBe(422);

    const zeroQty = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 0,
        referenceNumber: 'TRF-ERR-2',
      });
    expect(zeroQty.status).toBe(422);

    const overStock = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 50,
        referenceNumber: 'TRF-ERR-3',
      });
    expect(overStock.status).toBe(400);
  });

  it('prevents duplicate transfer completion and creates ledger entries exactly once', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 4,
        referenceNumber: 'TRF-DUP-001',
      });
    const transferId = createRes.body.data.id;

    await request(app)
      .put(`/api/transfers/${transferId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    await request(app)
      .put(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({});

    const [c1, c2] = await Promise.all([
      request(app)
        .put(`/api/transfers/${transferId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}),
      request(app)
        .put(`/api/transfers/${transferId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}),
    ]);

    const statuses = [c1.status, c2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const txRows = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'TRANSFER', referenceId: transferId },
    });
    expect(txRows.length).toBe(2);
  });

  it('prevents concurrent stock over-allocation across simultaneous deductions', async () => {
    // Available at Fort Alpha = 10 trucks. Two concurrent expenditures of 7 each: only one may succeed.
    const [e1, e2] = await Promise.all([
      request(app)
        .post('/api/expenditures')
        .set('Authorization', `Bearer ${commanderToken}`)
        .send({
          equipmentTypeId: fixtures.equipment.truck.id,
          quantity: 7,
          expenditureDate: '2026-10-05T00:00:00.000Z',
          reason: 'Concurrent test 1',
          referenceNumber: 'EXP-CONC-1',
        }),
      request(app)
        .post('/api/expenditures')
        .set('Authorization', `Bearer ${commanderToken}`)
        .send({
          equipmentTypeId: fixtures.equipment.truck.id,
          quantity: 7,
          expenditureDate: '2026-10-05T00:00:00.000Z',
          reason: 'Concurrent test 2',
          referenceNumber: 'EXP-CONC-2',
        }),
    ]);

    const statuses = [e1.status, e2.status].sort();
    expect(statuses).toEqual([201, 400]);
  });

  it('blocks Base Commander from initiating transfers or completing transfers not destined to their base', async () => {
    const initiateRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 2,
        referenceNumber: 'TRF-UNAUTH-1',
      });
    expect(initiateRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${logisticsToken}`)
      .send({
        sourceBaseId: fixtures.bases.fortAlpha.id,
        destinationBaseId: fixtures.bases.fortBravo.id,
        equipmentTypeId: fixtures.equipment.truck.id,
        quantity: 2,
        referenceNumber: 'TRF-UNAUTH-2',
      });
    const transferId = createRes.body.data.id;

    await request(app)
      .put(`/api/transfers/${transferId}/approve`)
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({});
    await request(app)
      .put(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({});

    // Commander Alpha cannot complete a transfer destined to Fort Bravo
    const completeByWrongCommander = await request(app)
      .put(`/api/transfers/${transferId}/complete`)
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({});
    expect(completeByWrongCommander.status).toBe(403);
  });
});

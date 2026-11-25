import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { loginAs, resetTestDatabase, seedTestFixtures } from './testHelper.js';

describe('Audit Logging & Immutability', () => {
  let fixtures;
  let adminToken;
  let commanderToken;

  beforeEach(async () => {
    await resetTestDatabase();
    fixtures = await seedTestFixtures();
    adminToken = (await loginAs('admin_user', 'AdminPass123!')).token;
    commanderToken = (await loginAs('commander_alpha', 'CommandPass123!')).token;
  });

  it('creates an audit record for successful mutations and does not log failed mutations', async () => {
    const purchaseRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseId: fixtures.bases.fortAlpha.id,
        equipmentTypeId: fixtures.equipment.rifle.id,
        quantity: 10,
        purchaseDate: '2026-10-01T00:00:00.000Z',
        referenceNumber: 'PO-AUD-001',
        supplier: 'Ordnance Ltd',
      });
    expect(purchaseRes.status).toBe(201);

    // Failed expenditure (exceeds stock of 10)
    const failExpRes = await request(app)
      .post('/api/expenditures')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({
        equipmentTypeId: fixtures.equipment.rifle.id,
        quantity: 99,
        expenditureDate: '2026-10-02T00:00:00.000Z',
        reason: 'Should fail',
        referenceNumber: 'EXP-AUD-FAIL',
      });
    expect(failExpRes.status).toBe(400);

    const logs = await prisma.auditLog.findMany({
      where: { entityType: { in: ['PURCHASE', 'EXPENDITURE'] } },
    });

    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('PURCHASE_CREATED');
    expect(logs[0].userId).toBe(fixtures.users.adminUser.id);
    expect(logs[0].newValues).toBeTruthy();
  });

  it('records previous and new values on entity updates and disallows audit log mutation APIs', async () => {
    const baseUpdateRes = await request(app)
      .put(`/api/bases/${fixtures.bases.fortAlpha.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ location: 'Updated Sector 1' });
    expect(baseUpdateRes.status).toBe(200);

    const auditRes = await request(app)
      .get('/api/audit-logs?entityType=BASE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBe(1);
    expect(auditRes.body.data[0].previousValues.location).toBe('Sector 1');
    expect(auditRes.body.data[0].newValues.location).toBe('Updated Sector 1');

    // Audit endpoints are strictly read-only
    const putAttempt = await request(app)
      .put(`/api/audit-logs/${auditRes.body.data[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ details: 'Tampered' });
    expect(putAttempt.status).toBe(404);

    const deleteAttempt = await request(app)
      .delete(`/api/audit-logs/${auditRes.body.data[0].id}`)
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(deleteAttempt.status).toBe(404);
  });
});

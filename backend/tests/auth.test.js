import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import env from '../src/config/env.js';
import { loginAs, resetTestDatabase, seedTestFixtures } from './testHelper.js';

describe('Authentication API', () => {
  let fixtures;

  beforeEach(async () => {
    await resetTestDatabase();
    fixtures = await seedTestFixtures();
  });

  it('logs in with valid credentials, returns accessToken and sets HttpOnly refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_user', password: 'AdminPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.username).toBe('admin_user');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.join(';')).toContain('HttpOnly');
    expect(setCookie.join(';')).toContain('mams_refresh_token');
  });

  it('rejects invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_user', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown username with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost_user', password: 'AdminPass123!' });

    expect(res.status).toBe(401);
  });

  it('rejects missing JWT on protected route with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects expired JWT on protected route with 401', async () => {
    const expiredToken = jwt.sign(
      { sub: fixtures.users.adminUser.id, role: 'ADMIN' },
      env.jwtSecret,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('blocks deactivated user on both login and existing JWT usage', async () => {
    const { token } = await loginAs('commander_alpha', 'CommandPass123!');

    await prisma.user.update({
      where: { id: fixtures.users.commanderAlpha.id },
      data: { isActive: false },
    });

    const protectedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(protectedRes.status).toBe(403);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'commander_alpha', password: 'CommandPass123!' });
    expect(loginRes.status).toBe(403);
  });

  it('refreshes access token via cookie and revokes session on logout', async () => {
    const loginRes = await loginAs('admin_user', 'AdminPass123!');

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', loginRes.cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();

    const rotatedCookies = refreshRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', rotatedCookies);
    expect(logoutRes.status).toBe(200);

    const postLogoutRefresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', rotatedCookies);
    expect(postLogoutRefresh.status).toBe(401);
  });
});

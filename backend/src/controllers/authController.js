import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import prisma from '../config/database.js';
import { policies } from '../config/policies.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';

const REFRESH_COOKIE_NAME = 'mams_refresh_token';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      baseId: user.baseId || null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    baseId: user.baseId,
    isActive: user.isActive,
    base: user.base || null,
  };
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        base: { select: { id: true, name: true, location: true, isActive: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated. Contact an administrator.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    await createAuditLog(prisma, {
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      baseId: user.baseId,
      details: `User ${user.username} logged in`,
      ipAddress: extractClientIp(req),
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return sendSuccess(res, {
      message: 'Authentication successful',
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedError('Refresh token is missing');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtRefreshSecret);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh' || !decoded.sub) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        base: { select: { id: true, name: true, location: true, isActive: true } },
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError('Session has been revoked');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated');
    }

    if (user.refreshTokenHash !== hashToken(token)) {
      throw new UnauthorizedError('Refresh token mismatch');
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(newRefreshToken) },
    });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, {
      data: {
        accessToken: newAccessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    let userId = req.user?.id || null;

    if (!userId && token) {
      try {
        const decoded = jwt.verify(token, env.jwtRefreshSecret);
        userId = decoded.sub;
      } catch {
        // Ignore invalid token on logout and still clear cookie
      }
    }

    if (userId) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      path: '/api/auth',
    });

    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    return sendSuccess(res, {
      data: {
        user: sanitizeUser(req.user),
        policy: {
          logisticsGlobalScope: policies.logistics.globalScope,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

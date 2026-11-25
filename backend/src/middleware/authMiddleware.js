import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import prisma from '../config/database.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export async function authenticateToken(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token expired');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        baseId: true,
        isActive: true,
        base: {
          select: {
            id: true,
            name: true,
            location: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User session is no longer valid');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account has been deactivated');
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

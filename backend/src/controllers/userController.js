import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { ROLES } from '../config/policies.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  baseId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  base: {
    select: { id: true, name: true, location: true },
  },
};

export async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.query.role) where.role = req.query.role;
    if (req.query.baseId) where.baseId = req.query.baseId;
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      where.isActive = req.query.isActive === 'true';
    }
    if (req.query.search) {
      where.OR = [
        { username: { contains: req.query.search, mode: 'insensitive' } },
        { fullName: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, password, fullName, role, baseId, isActive = true } = req.body;

    if (role === ROLES.BASE_COMMANDER && !baseId) {
      throw new BadRequestError('A Base Commander must be assigned to a military base');
    }

    if (baseId) {
      const base = await prisma.base.findUnique({ where: { id: baseId } });
      if (!base) {
        throw new NotFoundError('Assigned base not found');
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName: fullName || null,
          role,
          baseId: baseId || null,
          isActive,
        },
        select: USER_SAFE_SELECT,
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: created.id,
        baseId: created.baseId,
        previousValues: null,
        newValues: {
          username: created.username,
          role: created.role,
          baseId: created.baseId,
          isActive: created.isActive,
        },
        details: `Created user ${created.username} (${created.role})`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'User created successfully',
      data: user,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, role, baseId, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const nextRole = role ?? existing.role;
    const nextBaseId = baseId !== undefined ? baseId : existing.baseId;

    if (nextRole === ROLES.BASE_COMMANDER && !nextBaseId) {
      throw new BadRequestError('A Base Commander must be assigned to a military base');
    }

    if (nextBaseId) {
      const base = await prisma.base.findUnique({ where: { id: nextBaseId } });
      if (!base) {
        throw new NotFoundError('Assigned base not found');
      }
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (baseId !== undefined) updateData.baseId = baseId;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
      updateData.refreshTokenHash = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: updateData,
        select: USER_SAFE_SELECT,
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: id,
        baseId: record.baseId,
        previousValues: {
          fullName: existing.fullName,
          role: existing.role,
          baseId: existing.baseId,
        },
        newValues: {
          fullName: record.fullName,
          role: record.role,
          baseId: record.baseId,
          passwordReset: Boolean(password),
        },
        details: `Updated user ${record.username}`,
        ipAddress: extractClientIp(req),
      });

      return record;
    });

    return sendSuccess(res, {
      message: 'User updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user.id && !isActive) {
      throw new BadRequestError('Administrators cannot deactivate their own active account');
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: {
          isActive,
          refreshTokenHash: isActive ? existing.refreshTokenHash : null,
        },
        select: USER_SAFE_SELECT,
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'USER',
        entityId: id,
        baseId: record.baseId,
        previousValues: { isActive: existing.isActive },
        newValues: { isActive: record.isActive },
        details: `${isActive ? 'Activated' : 'Deactivated'} user ${record.username}`,
        ipAddress: extractClientIp(req),
      });

      return record;
    });

    return sendSuccess(res, {
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

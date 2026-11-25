import prisma from '../config/database.js';
import { hasGlobalBaseAccess, ROLES } from '../config/policies.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

export async function listBases(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (!hasGlobalBaseAccess(req.user)) {
      where.id = req.user.baseId;
    }

    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      where.isActive = req.query.isActive === 'true';
    } else if (req.user.role !== ROLES.ADMIN) {
      where.isActive = true;
    }

    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { location: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.base.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.base.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBaseById(req, res, next) {
  try {
    const { id } = req.params;

    if (!hasGlobalBaseAccess(req.user) && id !== req.user.baseId) {
      throw new ForbiddenError('Access to another military base is forbidden');
    }

    const base = await prisma.base.findUnique({ where: { id } });
    if (!base) {
      throw new NotFoundError('Military base not found');
    }

    return sendSuccess(res, { data: base });
  } catch (err) {
    return next(err);
  }
}

export async function createBase(req, res, next) {
  try {
    const { name, location, description, isActive = true } = req.body;

    const base = await prisma.$transaction(async (tx) => {
      const created = await tx.base.create({
        data: {
          name,
          location,
          description: description || null,
          isActive,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'BASE_CREATED',
        entityType: 'BASE',
        entityId: created.id,
        baseId: created.id,
        previousValues: null,
        newValues: created,
        details: `Created military base ${created.name} (${created.location})`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Military base created successfully',
      data: base,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateBase(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.base.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Military base not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.base.update({
        where: { id },
        data: {
          name: req.body.name ?? existing.name,
          location: req.body.location ?? existing.location,
          description: req.body.description !== undefined ? req.body.description : existing.description,
          isActive: req.body.isActive !== undefined ? req.body.isActive : existing.isActive,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'BASE_UPDATED',
        entityType: 'BASE',
        entityId: id,
        baseId: id,
        previousValues: {
          name: existing.name,
          location: existing.location,
          description: existing.description,
          isActive: existing.isActive,
        },
        newValues: {
          name: record.name,
          location: record.location,
          description: record.description,
          isActive: record.isActive,
        },
        details: `Updated military base ${record.name}`,
        ipAddress: extractClientIp(req),
      });

      return record;
    });

    return sendSuccess(res, {
      message: 'Military base updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

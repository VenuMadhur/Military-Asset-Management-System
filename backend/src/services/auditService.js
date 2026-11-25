import prisma from '../config/database.js';
import { policies, ROLES } from '../config/policies.js';
import { buildPaginationMeta, parsePagination } from '../utils/response.js';

export function extractClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || null;
}

export async function createAuditLog(
  txOrPrisma,
  {
    userId,
    action,
    entityType,
    entityId,
    baseId = null,
    previousValues = null,
    newValues = null,
    details = null,
    ipAddress = null,
  }
) {
  const client = txOrPrisma || prisma;
  return client.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: String(entityId),
      baseId: baseId || null,
      previousValues: previousValues ?? undefined,
      newValues: newValues ?? undefined,
      details,
      ipAddress,
    },
  });
}

export async function listAuditLogs({ user, query }) {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (user.role === ROLES.BASE_COMMANDER) {
    where.baseId = user.baseId;
  } else if (user.role === ROLES.LOGISTICS_OFFICER) {
    where.entityType = { in: policies.logistics.allowedAuditEntityTypes };
    if (!policies.logistics.globalScope && user.baseId) {
      where.baseId = user.baseId;
    } else if (query.baseId) {
      where.baseId = query.baseId;
    }
  } else if (query.baseId) {
    where.baseId = query.baseId;
  }

  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
  if (query.entityType && user.role !== ROLES.LOGISTICS_OFFICER) {
    where.entityType = query.entityType;
  } else if (
    query.entityType &&
    user.role === ROLES.LOGISTICS_OFFICER &&
    policies.logistics.allowedAuditEntityTypes.includes(query.entityType)
  ) {
    where.entityType = query.entityType;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        base: { select: { id: true, name: true, location: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
}

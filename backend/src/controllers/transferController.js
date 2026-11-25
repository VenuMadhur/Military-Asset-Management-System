import prisma from '../config/database.js';
import { policies, ROLES } from '../config/policies.js';
import { extractClientIp } from '../services/auditService.js';
import * as transferService from '../services/transferService.js';
import { ForbiddenError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

const transferInclude = {
  sourceBase: { select: { id: true, name: true, location: true } },
  destinationBase: { select: { id: true, name: true, location: true } },
  equipmentType: { select: { id: true, name: true, category: true, unit: true } },
  initiator: { select: { id: true, username: true, fullName: true, role: true } },
  approver: { select: { id: true, username: true, fullName: true, role: true } },
};

export async function listTransfers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    const isBaseRestricted =
      req.user.role === ROLES.BASE_COMMANDER ||
      (req.user.role === ROLES.LOGISTICS_OFFICER && !policies.logistics.globalScope);

    if (isBaseRestricted) {
      const userBaseId = req.user.baseId;
      if (req.query.baseId && req.query.baseId !== userBaseId) {
        throw new ForbiddenError('Access to another military base is forbidden');
      }
      if (
        req.query.sourceBaseId &&
        req.query.destinationBaseId &&
        req.query.sourceBaseId !== userBaseId &&
        req.query.destinationBaseId !== userBaseId
      ) {
        throw new ForbiddenError('Access to transfers unrelated to your base is forbidden');
      }
      if (
        req.query.sourceBaseId &&
        !req.query.destinationBaseId &&
        req.query.sourceBaseId !== userBaseId
      ) {
        // Still allow only if destinationBaseId is userBaseId, otherwise reject
        where.AND = [{ sourceBaseId: req.query.sourceBaseId }, { destinationBaseId: userBaseId }];
      } else if (
        req.query.destinationBaseId &&
        !req.query.sourceBaseId &&
        req.query.destinationBaseId !== userBaseId
      ) {
        where.AND = [{ destinationBaseId: req.query.destinationBaseId }, { sourceBaseId: userBaseId }];
      } else {
        where.OR = [{ sourceBaseId: userBaseId }, { destinationBaseId: userBaseId }];
      }
    } else {
      if (req.query.baseId) {
        where.OR = [{ sourceBaseId: req.query.baseId }, { destinationBaseId: req.query.baseId }];
      }
      if (req.query.sourceBaseId) where.sourceBaseId = req.query.sourceBaseId;
      if (req.query.destinationBaseId) where.destinationBaseId = req.query.destinationBaseId;
    }

    if (req.query.status) where.status = req.query.status;
    if (req.query.equipmentTypeId) {
      where.equipmentTypeId = req.query.equipmentTypeId;
    } else if (req.query.category) {
      where.equipmentType = { category: req.query.category };
    }
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { referenceNumber: { contains: req.query.search, mode: 'insensitive' } },
            { equipmentType: { name: { contains: req.query.search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: transferInclude,
      }),
      prisma.transfer.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createTransfer(req, res, next) {
  try {
    const transfer = await transferService.initiateTransfer({
      user: req.user,
      ...req.body,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Transfer request created (PENDING)',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

export async function approveTransfer(req, res, next) {
  try {
    const transfer = await transferService.approveTransfer({
      user: req.user,
      transferId: req.params.id,
      remarks: req.body?.remarks,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      message: 'Transfer approved and stock reserved',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

export async function dispatchTransfer(req, res, next) {
  try {
    const transfer = await transferService.dispatchTransfer({
      user: req.user,
      transferId: req.params.id,
      remarks: req.body?.remarks,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      message: 'Transfer dispatched (IN_TRANSIT)',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

export async function completeTransfer(req, res, next) {
  try {
    const transfer = await transferService.completeTransfer({
      user: req.user,
      transferId: req.params.id,
      remarks: req.body?.remarks,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      message: 'Transfer completed and inventory updated',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

export async function rejectTransfer(req, res, next) {
  try {
    const transfer = await transferService.rejectTransfer({
      user: req.user,
      transferId: req.params.id,
      remarks: req.body?.remarks,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      message: 'Transfer rejected',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

export async function cancelTransfer(req, res, next) {
  try {
    const transfer = await transferService.cancelTransfer({
      user: req.user,
      transferId: req.params.id,
      remarks: req.body?.remarks,
      ipAddress: extractClientIp(req),
    });
    return sendSuccess(res, {
      message: 'Transfer cancelled',
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
}

import prisma from '../config/database.js';
import { ROLES } from '../config/policies.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { assertSufficientAvailableStock, lockBaseEquipmentPairs } from '../services/inventoryService.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

const expenditureInclude = {
  base: { select: { id: true, name: true, location: true } },
  equipmentType: { select: { id: true, name: true, category: true, unit: true } },
  creator: { select: { id: true, username: true, fullName: true } },
};

export async function listExpenditures(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.effectiveBaseId) where.baseId = req.effectiveBaseId;
    if (req.query.equipmentTypeId) {
      where.equipmentTypeId = req.query.equipmentTypeId;
    } else if (req.query.category) {
      where.equipmentType = { category: req.query.category };
    }
    if (req.query.startDate || req.query.endDate) {
      where.expenditureDate = {};
      if (req.query.startDate) where.expenditureDate.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.expenditureDate.lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      where.OR = [
        { referenceNumber: { contains: req.query.search, mode: 'insensitive' } },
        { reason: { contains: req.query.search, mode: 'insensitive' } },
        { equipmentType: { name: { contains: req.query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.expenditure.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenditureDate: 'desc' },
        include: expenditureInclude,
      }),
      prisma.expenditure.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createExpenditure(req, res, next) {
  try {
    const targetBaseId =
      req.user.role === ROLES.BASE_COMMANDER ? req.user.baseId : req.body.baseId;

    if (!targetBaseId) {
      throw new BadRequestError('baseId is required for recording an expenditure');
    }

    const { equipmentTypeId, quantity, expenditureDate, reason, referenceNumber, remarks } = req.body;
    const parsedDate = new Date(expenditureDate);

    const expenditure = await prisma.$transaction(async (tx) => {
      const [base, equipment] = await Promise.all([
        tx.base.findUnique({ where: { id: targetBaseId } }),
        tx.equipmentType.findUnique({ where: { id: equipmentTypeId } }),
      ]);

      if (!base || !base.isActive) {
        throw new NotFoundError('Military base not found or inactive');
      }
      if (!equipment || !equipment.isActive) {
        throw new NotFoundError('Equipment type not found or inactive');
      }

      await lockBaseEquipmentPairs(tx, [{ baseId: targetBaseId, equipmentTypeId }]);
      await assertSufficientAvailableStock(tx, targetBaseId, equipmentTypeId, quantity);

      const created = await tx.expenditure.create({
        data: {
          baseId: targetBaseId,
          equipmentTypeId,
          quantity,
          expenditureDate: parsedDate,
          reason,
          referenceNumber,
          remarks: remarks || null,
          createdBy: req.user.id,
        },
        include: expenditureInclude,
      });

      await tx.inventoryTransaction.create({
        data: {
          baseId: targetBaseId,
          equipmentTypeId,
          transactionType: 'EXPENDITURE',
          quantity: -quantity,
          referenceType: 'EXPENDITURE',
          referenceId: created.id,
          occurredAt: parsedDate,
          createdBy: req.user.id,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'EXPENDITURE_RECORDED',
        entityType: 'EXPENDITURE',
        entityId: created.id,
        baseId: targetBaseId,
        previousValues: null,
        newValues: {
          baseId: targetBaseId,
          equipmentTypeId,
          quantity,
          reason,
          referenceNumber,
        },
        details: `Recorded expenditure ${referenceNumber}: -${quantity} ${equipment.unit} of ${equipment.name} at ${base.name} (${reason})`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Expenditure recorded and inventory updated successfully',
      data: expenditure,
    });
  } catch (err) {
    return next(err);
  }
}

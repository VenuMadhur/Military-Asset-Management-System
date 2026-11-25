import prisma from '../config/database.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import * as dashboardService from '../services/dashboardService.js';
import { getStockSnapshot, lockBaseEquipmentPairs } from '../services/inventoryService.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary({
      baseId: req.effectiveBaseId || null,
      category: req.query.category || null,
      equipmentTypeId: req.query.equipmentTypeId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    });
    return sendSuccess(res, { data: summary });
  } catch (err) {
    return next(err);
  }
}

export async function getMovements(req, res, next) {
  try {
    const data = await dashboardService.getDashboardMovements({
      baseId: req.effectiveBaseId || null,
      category: req.query.category || null,
      equipmentTypeId: req.query.equipmentTypeId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    });
    return sendSuccess(res, { data });
  } catch (err) {
    return next(err);
  }
}

export async function getInventory(req, res, next) {
  try {
    const result = await dashboardService.getDashboardInventory({
      ...req.query,
      baseId: req.effectiveBaseId || null,
    });
    return sendSuccess(res, {
      data: {
        items: result.items,
        totals: result.totals,
      },
      pagination: result.pagination,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getReports(req, res, next) {
  try {
    const reports = await dashboardService.getDashboardReports({
      baseId: req.effectiveBaseId || null,
      category: req.query.category || null,
      equipmentTypeId: req.query.equipmentTypeId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    });
    return sendSuccess(res, { data: reports });
  } catch (err) {
    return next(err);
  }
}

export async function createAdjustment(req, res, next) {
  try {
    const { baseId, equipmentTypeId, quantityDelta, reason, occurredAt } = req.body;
    const effectiveDate = occurredAt ? new Date(occurredAt) : new Date();

    const transaction = await prisma.$transaction(async (tx) => {
      const [base, equipment] = await Promise.all([
        tx.base.findUnique({ where: { id: baseId } }),
        tx.equipmentType.findUnique({ where: { id: equipmentTypeId } }),
      ]);

      if (!base || !base.isActive) {
        throw new NotFoundError('Target base not found or inactive');
      }
      if (!equipment || !equipment.isActive) {
        throw new NotFoundError('Equipment type not found or inactive');
      }

      await lockBaseEquipmentPairs(tx, [{ baseId, equipmentTypeId }]);
      const snapshot = await getStockSnapshot(tx, baseId, equipmentTypeId);

      if (snapshot.availableQuantity + quantityDelta < 0) {
        throw new BadRequestError(
          `Adjustment would result in negative available stock. Available: ${snapshot.availableQuantity}, Delta: ${quantityDelta}`
        );
      }

      const txRecord = await tx.inventoryTransaction.create({
        data: {
          baseId,
          equipmentTypeId,
          transactionType: 'ADJUSTMENT',
          quantity: quantityDelta,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: req.user.id,
          occurredAt: effectiveDate,
          createdBy: req.user.id,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'INVENTORY_ADJUSTMENT',
        entityType: 'INVENTORY',
        entityId: txRecord.id,
        baseId,
        previousValues: {
          completedBalance: snapshot.completedBalance,
          availableQuantity: snapshot.availableQuantity,
        },
        newValues: {
          completedBalance: snapshot.completedBalance + quantityDelta,
          availableQuantity: snapshot.availableQuantity + quantityDelta,
          quantityDelta,
          reason,
        },
        details: `Admin adjustment (${quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta} ${equipment.unit}) for ${equipment.name} at ${base.name}: ${reason}`,
        ipAddress: extractClientIp(req),
      });

      return txRecord;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Administrative inventory adjustment applied and logged',
      data: transaction,
    });
  } catch (err) {
    return next(err);
  }
}

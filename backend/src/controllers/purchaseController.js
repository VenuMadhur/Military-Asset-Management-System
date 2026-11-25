import prisma from '../config/database.js';
import { policies, ROLES } from '../config/policies.js';
import { authorizeResourceAccess } from '../middleware/rbacMiddleware.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { lockBaseEquipmentPairs } from '../services/inventoryService.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

const purchaseInclude = {
  base: { select: { id: true, name: true, location: true } },
  equipmentType: { select: { id: true, name: true, category: true, unit: true } },
  creator: { select: { id: true, username: true, fullName: true } },
};

export async function listPurchases(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.effectiveBaseId) {
      where.baseId = req.effectiveBaseId;
    }
    if (req.query.equipmentTypeId) {
      where.equipmentTypeId = req.query.equipmentTypeId;
    } else if (req.query.category) {
      where.equipmentType = { category: req.query.category };
    }
    if (req.query.startDate || req.query.endDate) {
      where.purchaseDate = {};
      if (req.query.startDate) where.purchaseDate.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.purchaseDate.lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      where.OR = [
        { referenceNumber: { contains: req.query.search, mode: 'insensitive' } },
        { supplier: { contains: req.query.search, mode: 'insensitive' } },
        { equipmentType: { name: { contains: req.query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: purchaseInclude,
      }),
      prisma.purchase.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getPurchaseById(req, res, next) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: purchaseInclude,
    });
    if (!purchase) {
      throw new NotFoundError('Purchase record not found');
    }
    authorizeResourceAccess(req.user, purchase.baseId);
    return sendSuccess(res, { data: purchase });
  } catch (err) {
    return next(err);
  }
}

export async function createPurchase(req, res, next) {
  try {
    const { baseId, equipmentTypeId, quantity, purchaseDate, referenceNumber, supplier, remarks } = req.body;

    if (
      req.user.role === ROLES.LOGISTICS_OFFICER &&
      !policies.logistics.globalScope &&
      req.user.baseId !== baseId
    ) {
      throw new ForbiddenError('Logistics policy restricts purchase creation to your home base');
    }

    const parsedDate = new Date(purchaseDate);

    const purchase = await prisma.$transaction(async (tx) => {
      const [base, equipment] = await Promise.all([
        tx.base.findUnique({ where: { id: baseId } }),
        tx.equipmentType.findUnique({ where: { id: equipmentTypeId } }),
      ]);

      if (!base || !base.isActive) {
        throw new NotFoundError('Target military base not found or inactive');
      }
      if (!equipment || !equipment.isActive) {
        throw new NotFoundError('Equipment type not found or inactive');
      }

      await lockBaseEquipmentPairs(tx, [{ baseId, equipmentTypeId }]);

      const created = await tx.purchase.create({
        data: {
          baseId,
          equipmentTypeId,
          quantity,
          purchaseDate: parsedDate,
          referenceNumber,
          supplier,
          remarks: remarks || null,
          createdBy: req.user.id,
        },
        include: purchaseInclude,
      });

      await tx.inventoryTransaction.create({
        data: {
          baseId,
          equipmentTypeId,
          transactionType: 'PURCHASE',
          quantity,
          referenceType: 'PURCHASE',
          referenceId: created.id,
          occurredAt: parsedDate,
          createdBy: req.user.id,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'PURCHASE_CREATED',
        entityType: 'PURCHASE',
        entityId: created.id,
        baseId,
        previousValues: null,
        newValues: {
          baseId,
          equipmentTypeId,
          quantity,
          purchaseDate: parsedDate,
          referenceNumber,
          supplier,
        },
        details: `Recorded purchase ${referenceNumber}: +${quantity} ${equipment.unit} of ${equipment.name} at ${base.name}`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Purchase recorded and inventory updated successfully',
      data: purchase,
    });
  } catch (err) {
    return next(err);
  }
}

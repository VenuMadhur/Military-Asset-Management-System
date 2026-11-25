import prisma from '../config/database.js';
import { ROLES } from '../config/policies.js';
import { authorizeResourceAccess } from '../middleware/rbacMiddleware.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { assertSufficientAvailableStock, lockBaseEquipmentPairs } from '../services/inventoryService.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

const assignmentInclude = {
  base: { select: { id: true, name: true, location: true } },
  equipmentType: { select: { id: true, name: true, category: true, unit: true } },
  creator: { select: { id: true, username: true, fullName: true } },
};

export async function listAssignments(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.effectiveBaseId) where.baseId = req.effectiveBaseId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.equipmentTypeId) {
      where.equipmentTypeId = req.query.equipmentTypeId;
    } else if (req.query.category) {
      where.equipmentType = { category: req.query.category };
    }
    if (req.query.startDate || req.query.endDate) {
      where.assignmentDate = {};
      if (req.query.startDate) where.assignmentDate.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.assignmentDate.lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      where.OR = [
        { assignedTo: { contains: req.query.search, mode: 'insensitive' } },
        { equipmentType: { name: { contains: req.query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignmentDate: 'desc' },
        include: assignmentInclude,
      }),
      prisma.assignment.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createAssignment(req, res, next) {
  try {
    const targetBaseId =
      req.user.role === ROLES.BASE_COMMANDER ? req.user.baseId : req.body.baseId;

    if (!targetBaseId) {
      throw new BadRequestError('baseId is required for creating an assignment');
    }

    const { equipmentTypeId, quantity, assignedTo, assignmentDate, remarks } = req.body;
    const parsedDate = new Date(assignmentDate);

    const assignment = await prisma.$transaction(async (tx) => {
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

      const created = await tx.assignment.create({
        data: {
          baseId: targetBaseId,
          equipmentTypeId,
          quantity,
          assignedTo,
          assignmentDate: parsedDate,
          status: 'ACTIVE',
          remarks: remarks || null,
          createdBy: req.user.id,
        },
        include: assignmentInclude,
      });

      await tx.inventoryTransaction.create({
        data: {
          baseId: targetBaseId,
          equipmentTypeId,
          transactionType: 'ASSIGNMENT',
          quantity: -quantity,
          referenceType: 'ASSIGNMENT',
          referenceId: created.id,
          occurredAt: parsedDate,
          createdBy: req.user.id,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'ASSIGNMENT',
        entityId: created.id,
        baseId: targetBaseId,
        previousValues: null,
        newValues: {
          baseId: targetBaseId,
          equipmentTypeId,
          quantity,
          assignedTo,
          status: 'ACTIVE',
        },
        details: `Assigned ${quantity} ${equipment.unit} of ${equipment.name} to ${assignedTo} at ${base.name}`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Asset assigned successfully',
      data: assignment,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id FROM assignments WHERE id = ${id} FOR UPDATE
      `;
      if (!locked || locked.length === 0) {
        throw new NotFoundError('Assignment record not found');
      }

      const existing = await tx.assignment.findUnique({
        where: { id },
        include: assignmentInclude,
      });

      authorizeResourceAccess(req.user, existing.baseId);

      if (status === 'RETURNED' && existing.status === 'RETURNED') {
        throw new ConflictError('Assignment has already been returned');
      }

      if (status === 'ACTIVE' && existing.status === 'RETURNED') {
        throw new ConflictError('Returned assignments cannot be reverted to ACTIVE');
      }

      const returnedAt = status === 'RETURNED' ? new Date() : existing.returnedAt;

      if (status === 'RETURNED') {
        await lockBaseEquipmentPairs(tx, [
          { baseId: existing.baseId, equipmentTypeId: existing.equipmentTypeId },
        ]);

        await tx.inventoryTransaction.create({
          data: {
            baseId: existing.baseId,
            equipmentTypeId: existing.equipmentTypeId,
            transactionType: 'ASSIGNMENT_RETURN',
            quantity: existing.quantity,
            referenceType: 'ASSIGNMENT',
            referenceId: existing.id,
            occurredAt: returnedAt,
            createdBy: req.user.id,
          },
        });
      }

      const record = await tx.assignment.update({
        where: { id },
        data: {
          status: status ?? existing.status,
          returnedAt,
          remarks: remarks !== undefined ? remarks : existing.remarks,
        },
        include: assignmentInclude,
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: status === 'RETURNED' ? 'ASSIGNMENT_RETURNED' : 'ASSIGNMENT_UPDATED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        baseId: existing.baseId,
        previousValues: { status: existing.status, remarks: existing.remarks },
        newValues: { status: record.status, remarks: record.remarks, returnedAt },
        details:
          status === 'RETURNED'
            ? `Returned ${existing.quantity} ${existing.equipmentType.unit} of ${existing.equipmentType.name} from ${existing.assignedTo}`
            : `Updated assignment ${id}`,
        ipAddress: extractClientIp(req),
      });

      return record;
    });

    return sendSuccess(res, {
      message: status === 'RETURNED' ? 'Assigned assets returned to inventory' : 'Assignment updated',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

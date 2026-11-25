import prisma from '../config/database.js';
import { createAuditLog, extractClientIp } from '../services/auditService.js';
import { NotFoundError } from '../utils/errors.js';
import { buildPaginationMeta, parsePagination, sendSuccess } from '../utils/response.js';

export async function listEquipment(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};

    if (req.query.category) where.category = req.query.category;
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      where.isActive = req.query.isActive === 'true';
    }
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.equipmentType.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.equipmentType.count({ where }),
    ]);

    return sendSuccess(res, {
      data: items,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getEquipmentById(req, res, next) {
  try {
    const equipment = await prisma.equipmentType.findUnique({ where: { id: req.params.id } });
    if (!equipment) {
      throw new NotFoundError('Equipment type not found');
    }
    return sendSuccess(res, { data: equipment });
  } catch (err) {
    return next(err);
  }
}

export async function createEquipment(req, res, next) {
  try {
    const { name, category, description, unit = 'UNITS', isActive = true } = req.body;

    const equipment = await prisma.$transaction(async (tx) => {
      const created = await tx.equipmentType.create({
        data: {
          name,
          category,
          description: description || null,
          unit,
          isActive,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'EQUIPMENT_CREATED',
        entityType: 'EQUIPMENT',
        entityId: created.id,
        previousValues: null,
        newValues: created,
        details: `Created equipment type ${created.name} (${created.category})`,
        ipAddress: extractClientIp(req),
      });

      return created;
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Equipment type created successfully',
      data: equipment,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateEquipment(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.equipmentType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Equipment type not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.equipmentType.update({
        where: { id },
        data: {
          name: req.body.name ?? existing.name,
          category: req.body.category ?? existing.category,
          description: req.body.description !== undefined ? req.body.description : existing.description,
          unit: req.body.unit ?? existing.unit,
          isActive: req.body.isActive !== undefined ? req.body.isActive : existing.isActive,
        },
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: 'EQUIPMENT_UPDATED',
        entityType: 'EQUIPMENT',
        entityId: id,
        previousValues: {
          name: existing.name,
          category: existing.category,
          unit: existing.unit,
          isActive: existing.isActive,
        },
        newValues: {
          name: record.name,
          category: record.category,
          unit: record.unit,
          isActive: record.isActive,
        },
        details: `Updated equipment type ${record.name}`,
        ipAddress: extractClientIp(req),
      });

      return record;
    });

    return sendSuccess(res, {
      message: 'Equipment type updated successfully',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

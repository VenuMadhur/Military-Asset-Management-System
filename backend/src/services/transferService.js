import prisma from '../config/database.js';
import { policies, ROLES } from '../config/policies.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { assertSufficientAvailableStock, lockBaseEquipmentPairs } from './inventoryService.js';

const transferInclude = {
  sourceBase: { select: { id: true, name: true, location: true } },
  destinationBase: { select: { id: true, name: true, location: true } },
  equipmentType: { select: { id: true, name: true, category: true, unit: true } },
  initiator: { select: { id: true, username: true, fullName: true, role: true } },
  approver: { select: { id: true, username: true, fullName: true, role: true } },
};

async function lockTransferRow(tx, transferId) {
  const locked = await tx.$queryRaw`
    SELECT id FROM transfers WHERE id = ${transferId} FOR UPDATE
  `;
  if (!locked || locked.length === 0) {
    throw new NotFoundError('Transfer request not found');
  }
  return tx.transfer.findUnique({
    where: { id: transferId },
    include: transferInclude,
  });
}

function assertTransferActionPermission(user, transfer, action) {
  if (user.role === ROLES.ADMIN) return;

  if (user.role === ROLES.LOGISTICS_OFFICER) {
    if (!policies.logistics.globalScope && user.baseId) {
      const involvesHome =
        transfer.sourceBaseId === user.baseId || transfer.destinationBaseId === user.baseId;
      if (!involvesHome) {
        throw new ForbiddenError('Logistics policy restricts access to your assigned base');
      }
    }
    const policyMap = {
      APPROVE: policies.logistics.canApproveTransfers,
      REJECT: policies.logistics.canRejectTransfers,
      DISPATCH: policies.logistics.canDispatchTransfers,
      COMPLETE: policies.logistics.canCompleteTransfers,
      CANCEL: policies.logistics.canCancelTransfers,
    };
    if (!policyMap[action]) {
      throw new ForbiddenError(`Logistics Officer is not permitted to ${action.toLowerCase()} transfers`);
    }
    return;
  }

  if (user.role === ROLES.BASE_COMMANDER) {
    if (['APPROVE', 'REJECT', 'DISPATCH'].includes(action)) {
      if (transfer.sourceBaseId !== user.baseId) {
        throw new ForbiddenError('Base Commander can only approve, reject, or dispatch outgoing transfers from their own base');
      }
      return;
    }
    if (action === 'COMPLETE') {
      if (transfer.destinationBaseId !== user.baseId) {
        throw new ForbiddenError('Base Commander can only complete incoming transfers addressed to their own base');
      }
      return;
    }
    throw new ForbiddenError('Base Commander is not permitted to perform this transfer action');
  }

  throw new ForbiddenError('Insufficient permissions for transfer operation');
}

export async function initiateTransfer({
  user,
  sourceBaseId,
  destinationBaseId,
  equipmentTypeId,
  quantity,
  referenceNumber,
  remarks,
  ipAddress,
}) {
  if (sourceBaseId === destinationBaseId) {
    throw new BadRequestError('Source base and destination base must be different');
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestError('Transfer quantity must be a positive integer');
  }

  if (
    user.role === ROLES.LOGISTICS_OFFICER &&
    !policies.logistics.globalScope &&
    user.baseId &&
    sourceBaseId !== user.baseId &&
    destinationBaseId !== user.baseId
  ) {
    throw new ForbiddenError('Logistics scope restricts transfer initiation to your home base');
  }

  return prisma.$transaction(async (tx) => {
    const [sourceBase, destBase, equipment] = await Promise.all([
      tx.base.findUnique({ where: { id: sourceBaseId } }),
      tx.base.findUnique({ where: { id: destinationBaseId } }),
      tx.equipmentType.findUnique({ where: { id: equipmentTypeId } }),
    ]);

    if (!sourceBase || !sourceBase.isActive) {
      throw new NotFoundError('Source base not found or inactive');
    }
    if (!destBase || !destBase.isActive) {
      throw new NotFoundError('Destination base not found or inactive');
    }
    if (!equipment || !equipment.isActive) {
      throw new NotFoundError('Equipment type not found or inactive');
    }

    await lockBaseEquipmentPairs(tx, [{ baseId: sourceBaseId, equipmentTypeId }]);
    await assertSufficientAvailableStock(tx, sourceBaseId, equipmentTypeId, quantity);

    const transfer = await tx.transfer.create({
      data: {
        sourceBaseId,
        destinationBaseId,
        equipmentTypeId,
        quantity,
        status: 'PENDING',
        referenceNumber,
        remarks: remarks || null,
        initiatedBy: user.id,
      },
      include: transferInclude,
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_INITIATED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: sourceBaseId,
      previousValues: null,
      newValues: {
        status: transfer.status,
        sourceBaseId,
        destinationBaseId,
        equipmentTypeId,
        quantity,
        referenceNumber,
      },
      details: `Initiated transfer ${referenceNumber} (${quantity} ${equipment.unit} of ${equipment.name}) from ${sourceBase.name} to ${destBase.name}`,
      ipAddress,
    });

    return transfer;
  });
}

export async function approveTransfer({ user, transferId, remarks, ipAddress }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await lockTransferRow(tx, transferId);
    assertTransferActionPermission(user, transfer, 'APPROVE');

    if (transfer.status !== 'PENDING') {
      throw new ConflictError(`Cannot approve transfer from status ${transfer.status}`);
    }

    await lockBaseEquipmentPairs(tx, [
      { baseId: transfer.sourceBaseId, equipmentTypeId: transfer.equipmentTypeId },
    ]);
    await assertSufficientAvailableStock(
      tx,
      transfer.sourceBaseId,
      transfer.equipmentTypeId,
      transfer.quantity
    );

    const updated = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        remarks: remarks ? `${transfer.remarks ? `${transfer.remarks} | ` : ''}${remarks}` : transfer.remarks,
      },
      include: transferInclude,
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_APPROVED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: transfer.sourceBaseId,
      previousValues: { status: transfer.status },
      newValues: { status: updated.status, approvedBy: user.id },
      details: `Approved transfer ${transfer.referenceNumber}; reserved ${transfer.quantity} units at ${transfer.sourceBase.name}`,
      ipAddress,
    });

    return updated;
  });
}

export async function dispatchTransfer({ user, transferId, remarks, ipAddress }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await lockTransferRow(tx, transferId);
    assertTransferActionPermission(user, transfer, 'DISPATCH');

    if (transfer.status !== 'APPROVED') {
      throw new ConflictError(`Cannot dispatch transfer from status ${transfer.status}`);
    }

    const updated = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'IN_TRANSIT',
        remarks: remarks ? `${transfer.remarks ? `${transfer.remarks} | ` : ''}${remarks}` : transfer.remarks,
      },
      include: transferInclude,
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_DISPATCHED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: transfer.sourceBaseId,
      previousValues: { status: transfer.status },
      newValues: { status: updated.status },
      details: `Dispatched transfer ${transfer.referenceNumber} from ${transfer.sourceBase.name} to ${transfer.destinationBase.name}`,
      ipAddress,
    });

    return updated;
  });
}

export async function completeTransfer({ user, transferId, remarks, ipAddress }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await lockTransferRow(tx, transferId);
    assertTransferActionPermission(user, transfer, 'COMPLETE');

    if (transfer.status === 'COMPLETED') {
      throw new ConflictError('Transfer has already been completed');
    }
    if (transfer.status !== 'IN_TRANSIT') {
      throw new ConflictError(`Cannot complete transfer from status ${transfer.status}; it must be IN_TRANSIT`);
    }

    // Lock both (base, equipment) pairs in deterministic order to prevent deadlocks
    await lockBaseEquipmentPairs(tx, [
      { baseId: transfer.sourceBaseId, equipmentTypeId: transfer.equipmentTypeId },
      { baseId: transfer.destinationBaseId, equipmentTypeId: transfer.equipmentTypeId },
    ]);

    // Check completed physical balance at source base (since this transfer itself is IN_TRANSIT
    // and contributes to reservedQuantity, we check completedBalance >= quantity and verify no
    // over-reservation exists from other transfers).
    const [ledgerAgg, otherReservedAgg] = await Promise.all([
      tx.inventoryTransaction.aggregate({
        where: {
          baseId: transfer.sourceBaseId,
          equipmentTypeId: transfer.equipmentTypeId,
        },
        _sum: { quantity: true },
      }),
      tx.transfer.aggregate({
        where: {
          id: { not: transfer.id },
          sourceBaseId: transfer.sourceBaseId,
          equipmentTypeId: transfer.equipmentTypeId,
          status: { in: ['APPROVED', 'IN_TRANSIT'] },
        },
        _sum: { quantity: true },
      }),
    ]);

    const sourceCompleted = ledgerAgg._sum.quantity || 0;
    const otherReserved = otherReservedAgg._sum.quantity || 0;
    if (sourceCompleted - otherReserved < transfer.quantity) {
      throw new BadRequestError(
        `Insufficient stock at source base to complete transfer. Available: ${sourceCompleted - otherReserved}, Required: ${transfer.quantity}`
      );
    }

    const completedAt = new Date();

    const updated = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'COMPLETED',
        completedAt,
        remarks: remarks ? `${transfer.remarks ? `${transfer.remarks} | ` : ''}${remarks}` : transfer.remarks,
      },
      include: transferInclude,
    });

    // Atomically write TRANSFER_OUT (-qty) and TRANSFER_IN (+qty) once
    await tx.inventoryTransaction.createMany({
      data: [
        {
          baseId: transfer.sourceBaseId,
          equipmentTypeId: transfer.equipmentTypeId,
          transactionType: 'TRANSFER_OUT',
          quantity: -transfer.quantity,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          occurredAt: completedAt,
          createdBy: user.id,
        },
        {
          baseId: transfer.destinationBaseId,
          equipmentTypeId: transfer.equipmentTypeId,
          transactionType: 'TRANSFER_IN',
          quantity: transfer.quantity,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          occurredAt: completedAt,
          createdBy: user.id,
        },
      ],
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_COMPLETED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: transfer.destinationBaseId,
      previousValues: { status: transfer.status, completedAt: null },
      newValues: { status: updated.status, completedAt },
      details: `Completed transfer ${transfer.referenceNumber}: -${transfer.quantity} at ${transfer.sourceBase.name}, +${transfer.quantity} at ${transfer.destinationBase.name}`,
      ipAddress,
    });

    return updated;
  });
}

export async function rejectTransfer({ user, transferId, remarks, ipAddress }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await lockTransferRow(tx, transferId);
    assertTransferActionPermission(user, transfer, 'REJECT');

    if (transfer.status !== 'PENDING') {
      throw new ConflictError(`Cannot reject transfer from status ${transfer.status}`);
    }

    const updated = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'REJECTED',
        approvedBy: user.id,
        remarks: remarks ? `${transfer.remarks ? `${transfer.remarks} | ` : ''}${remarks}` : transfer.remarks,
      },
      include: transferInclude,
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_REJECTED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: transfer.sourceBaseId,
      previousValues: { status: transfer.status },
      newValues: { status: updated.status },
      details: `Rejected transfer ${transfer.referenceNumber}`,
      ipAddress,
    });

    return updated;
  });
}

export async function cancelTransfer({ user, transferId, remarks, ipAddress }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await lockTransferRow(tx, transferId);
    assertTransferActionPermission(user, transfer, 'CANCEL');

    if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
      throw new ConflictError(`Cannot cancel transfer from status ${transfer.status}`);
    }

    const updated = await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        status: 'CANCELLED',
        remarks: remarks ? `${transfer.remarks ? `${transfer.remarks} | ` : ''}${remarks}` : transfer.remarks,
      },
      include: transferInclude,
    });

    await createAuditLog(tx, {
      userId: user.id,
      action: 'TRANSFER_CANCELLED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      baseId: transfer.sourceBaseId,
      previousValues: { status: transfer.status },
      newValues: { status: updated.status },
      details: `Cancelled transfer ${transfer.referenceNumber}`,
      ipAddress,
    });

    return updated;
  });
}

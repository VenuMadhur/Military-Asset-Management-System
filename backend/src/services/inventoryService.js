import prisma from '../config/database.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Acquires a deterministic PostgreSQL transaction-scoped advisory lock
 * for one or more (baseId, equipmentTypeId) pairs to prevent concurrent
 * stock race conditions and deadlocks.
 */
export async function lockBaseEquipmentPairs(tx, pairs) {
  const uniqueKeys = [...new Set(pairs.map((p) => `${p.baseId}:${p.equipmentTypeId}`))].sort();
  for (const key of uniqueKeys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }
}

export async function getStockSnapshot(txOrPrisma, baseId, equipmentTypeId) {
  const client = txOrPrisma || prisma;
  const [ledgerAgg, reservedAgg] = await Promise.all([
    client.inventoryTransaction.aggregate({
      where: { baseId, equipmentTypeId },
      _sum: { quantity: true },
    }),
    client.transfer.aggregate({
      where: {
        sourceBaseId: baseId,
        equipmentTypeId,
        status: { in: ['APPROVED', 'IN_TRANSIT'] },
      },
      _sum: { quantity: true },
    }),
  ]);

  const completedBalance = ledgerAgg._sum.quantity || 0;
  const reservedQuantity = reservedAgg._sum.quantity || 0;
  const availableQuantity = completedBalance - reservedQuantity;

  return {
    completedBalance,
    reservedQuantity,
    availableQuantity,
  };
}

export async function assertSufficientAvailableStock(txOrPrisma, baseId, equipmentTypeId, requiredQuantity) {
  if (!Number.isInteger(requiredQuantity) || requiredQuantity <= 0) {
    throw new BadRequestError('Quantity must be a positive integer');
  }
  const snapshot = await getStockSnapshot(txOrPrisma, baseId, equipmentTypeId);
  if (snapshot.availableQuantity < requiredQuantity) {
    throw new BadRequestError(
      `Insufficient available stock. Available: ${snapshot.availableQuantity}, Requested: ${requiredQuantity}`
    );
  }
  return snapshot;
}

export function normalizeDateRange(startDateStr, endDateStr) {
  let startDate = null;
  let endDate = null;

  if (startDateStr) {
    startDate = new Date(startDateStr);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestError('Invalid startDate format');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
      startDate.setUTCHours(0, 0, 0, 0);
    }
  }

  if (endDateStr) {
    endDate = new Date(endDateStr);
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid endDate format');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
  }

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestError('startDate cannot be after endDate');
  }

  return { startDate, endDate };
}

/**
 * Computes ledger-backed inventory balances for a reporting period.
 * Formula:
 *   Net Movement = Purchases + Transfers In - Transfers Out
 *   Closing Balance = Opening Balance + Net Movement - Assigned - Expended + Adjustments
 */
export async function computeInventoryRows({
  baseId = null,
  category = null,
  equipmentTypeId = null,
  search = null,
  startDate = null,
  endDate = null,
}) {
  const { startDate: parsedStart, endDate: parsedEnd } = normalizeDateRange(startDate, endDate);

  const baseWhere = baseId ? { id: baseId } : { isActive: true };
  const equipWhere = {};
  if (equipmentTypeId) equipWhere.id = equipmentTypeId;
  if (category) equipWhere.category = category;
  if (search) {
    equipWhere.name = { contains: search, mode: 'insensitive' };
  }

  const [bases, equipmentTypes] = await Promise.all([
    prisma.base.findMany({
      where: baseWhere,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, location: true },
    }),
    prisma.equipmentType.findMany({
      where: equipWhere,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, unit: true, isActive: true },
    }),
  ]);

  if (bases.length === 0 || equipmentTypes.length === 0) {
    return { rows: [], totals: emptyTotals() };
  }

  const baseIds = bases.map((b) => b.id);
  const equipmentIds = equipmentTypes.map((e) => e.id);

  const baseFilter = { baseId: { in: baseIds }, equipmentTypeId: { in: equipmentIds } };

  const openingWhere = parsedStart
    ? { ...baseFilter, occurredAt: { lt: parsedStart } }
    : null;

  const periodWhere = { ...baseFilter };
  if (parsedStart || parsedEnd) {
    periodWhere.occurredAt = {};
    if (parsedStart) periodWhere.occurredAt.gte = parsedStart;
    if (parsedEnd) periodWhere.occurredAt.lte = parsedEnd;
  }

  const [openingGroups, periodGroups, currentLedgerGroups, reservedGroups] = await Promise.all([
    openingWhere
      ? prisma.inventoryTransaction.groupBy({
          by: ['baseId', 'equipmentTypeId'],
          where: openingWhere,
          _sum: { quantity: true },
        })
      : Promise.resolve([]),
    prisma.inventoryTransaction.groupBy({
      by: ['baseId', 'equipmentTypeId', 'transactionType'],
      where: periodWhere,
      _sum: { quantity: true },
    }),
    prisma.inventoryTransaction.groupBy({
      by: ['baseId', 'equipmentTypeId'],
      where: baseFilter,
      _sum: { quantity: true },
    }),
    prisma.transfer.groupBy({
      by: ['sourceBaseId', 'equipmentTypeId'],
      where: {
        sourceBaseId: { in: baseIds },
        equipmentTypeId: { in: equipmentIds },
        status: { in: ['APPROVED', 'IN_TRANSIT'] },
      },
      _sum: { quantity: true },
    }),
  ]);

  const openingMap = new Map();
  for (const row of openingGroups) {
    openingMap.set(`${row.baseId}:${row.equipmentTypeId}`, row._sum.quantity || 0);
  }

  const currentMap = new Map();
  for (const row of currentLedgerGroups) {
    currentMap.set(`${row.baseId}:${row.equipmentTypeId}`, row._sum.quantity || 0);
  }

  const reservedMap = new Map();
  for (const row of reservedGroups) {
    reservedMap.set(`${row.sourceBaseId}:${row.equipmentTypeId}`, row._sum.quantity || 0);
  }

  const periodMap = new Map();
  for (const row of periodGroups) {
    const key = `${row.baseId}:${row.equipmentTypeId}`;
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        purchases: 0,
        transfersIn: 0,
        transfersOut: 0,
        assignedGross: 0,
        returned: 0,
        expended: 0,
        adjustments: 0,
      });
    }
    const bucket = periodMap.get(key);
    const sum = row._sum.quantity || 0;
    switch (row.transactionType) {
      case 'PURCHASE':
        bucket.purchases += sum;
        break;
      case 'TRANSFER_IN':
        bucket.transfersIn += sum;
        break;
      case 'TRANSFER_OUT':
        bucket.transfersOut += Math.abs(sum);
        break;
      case 'ASSIGNMENT':
        bucket.assignedGross += Math.abs(sum);
        break;
      case 'ASSIGNMENT_RETURN':
        bucket.returned += sum;
        break;
      case 'EXPENDITURE':
        bucket.expended += Math.abs(sum);
        break;
      case 'ADJUSTMENT':
        bucket.adjustments += sum;
        break;
      default:
        break;
    }
  }

  const rows = [];
  const totals = emptyTotals();

  for (const base of bases) {
    for (const eq of equipmentTypes) {
      const key = `${base.id}:${eq.id}`;
      const openingBalance = openingMap.get(key) || 0;
      const period = periodMap.get(key) || {
        purchases: 0,
        transfersIn: 0,
        transfersOut: 0,
        assignedGross: 0,
        returned: 0,
        expended: 0,
        adjustments: 0,
      };
      const currentBalance = currentMap.get(key) || 0;
      const reservedQuantity = reservedMap.get(key) || 0;

      // Include active equipment types or any pair with historical/reserved activity
      const hasActivity =
        openingBalance !== 0 ||
        currentBalance !== 0 ||
        reservedQuantity !== 0 ||
        period.purchases !== 0 ||
        period.transfersIn !== 0 ||
        period.transfersOut !== 0 ||
        period.assignedGross !== 0 ||
        period.returned !== 0 ||
        period.expended !== 0 ||
        period.adjustments !== 0;

      if (!eq.isActive && !hasActivity) continue;

      const netMovement = period.purchases + period.transfersIn - period.transfersOut;
      const assigned = period.assignedGross - period.returned;
      const expended = period.expended;
      const closingBalance =
        openingBalance + netMovement - assigned - expended + period.adjustments;
      const availableQuantity = currentBalance - reservedQuantity;

      const item = {
        baseId: base.id,
        baseName: base.name,
        baseLocation: base.location,
        equipmentTypeId: eq.id,
        equipmentName: eq.name,
        category: eq.category,
        unit: eq.unit,
        openingBalance,
        purchases: period.purchases,
        transfersIn: period.transfersIn,
        transfersOut: period.transfersOut,
        netMovement,
        assigned,
        assignedGross: period.assignedGross,
        returned: period.returned,
        expended,
        adjustments: period.adjustments,
        closingBalance,
        reservedQuantity,
        availableQuantity,
      };

      rows.push(item);

      totals.openingBalance += openingBalance;
      totals.purchases += period.purchases;
      totals.transfersIn += period.transfersIn;
      totals.transfersOut += period.transfersOut;
      totals.netMovement += netMovement;
      totals.assigned += assigned;
      totals.expended += expended;
      totals.adjustments += period.adjustments;
      totals.closingBalance += closingBalance;
      totals.reservedQuantity += reservedQuantity;
      totals.availableQuantity += availableQuantity;
    }
  }

  return { rows, totals };
}

function emptyTotals() {
  return {
    openingBalance: 0,
    purchases: 0,
    transfersIn: 0,
    transfersOut: 0,
    netMovement: 0,
    assigned: 0,
    expended: 0,
    adjustments: 0,
    closingBalance: 0,
    reservedQuantity: 0,
    availableQuantity: 0,
  };
}

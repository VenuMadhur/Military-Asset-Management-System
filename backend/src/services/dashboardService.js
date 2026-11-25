import prisma from '../config/database.js';
import { buildPaginationMeta, parsePagination } from '../utils/response.js';
import { computeInventoryRows, normalizeDateRange } from './inventoryService.js';

export async function getDashboardSummary({
  baseId = null,
  category = null,
  equipmentTypeId = null,
  startDate = null,
  endDate = null,
}) {
  const { totals } = await computeInventoryRows({
    baseId,
    category,
    equipmentTypeId,
    startDate,
    endDate,
  });

  const transferScope = baseId
    ? { OR: [{ sourceBaseId: baseId }, { destinationBaseId: baseId }] }
    : {};
  const equipScope = equipmentTypeId
    ? { equipmentTypeId }
    : category
      ? { equipmentType: { category } }
      : {};

  const [pendingTransfers, inTransitTransfers, activeAssignments] = await Promise.all([
    prisma.transfer.count({
      where: { ...transferScope, ...equipScope, status: 'PENDING' },
    }),
    prisma.transfer.count({
      where: { ...transferScope, ...equipScope, status: 'IN_TRANSIT' },
    }),
    prisma.assignment.count({
      where: {
        ...(baseId ? { baseId } : {}),
        ...equipScope,
        status: 'ACTIVE',
      },
    }),
  ]);

  return {
    ...totals,
    counts: {
      pendingTransfers,
      inTransitTransfers,
      activeAssignments,
    },
    formula: {
      closingBalance: 'Opening Balance + Net Movement - Assigned - Expended',
      netMovement: 'Purchases + Transfers In - Transfers Out',
    },
  };
}

export async function getDashboardMovements({
  baseId = null,
  category = null,
  equipmentTypeId = null,
  startDate = null,
  endDate = null,
}) {
  const { startDate: parsedStart, endDate: parsedEnd } = normalizeDateRange(startDate, endDate);
  const { totals } = await computeInventoryRows({
    baseId,
    category,
    equipmentTypeId,
    startDate,
    endDate,
  });

  const where = {};
  if (baseId) where.baseId = baseId;
  if (equipmentTypeId) {
    where.equipmentTypeId = equipmentTypeId;
  } else if (category) {
    where.equipmentType = { category };
  }
  if (parsedStart || parsedEnd) {
    where.occurredAt = {};
    if (parsedStart) where.occurredAt.gte = parsedStart;
    if (parsedEnd) where.occurredAt.lte = parsedEnd;
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    orderBy: { occurredAt: 'asc' },
    select: {
      id: true,
      transactionType: true,
      quantity: true,
      occurredAt: true,
      referenceType: true,
      referenceId: true,
      base: { select: { id: true, name: true } },
      equipmentType: { select: { id: true, name: true, category: true, unit: true } },
    },
  });

  const dailyMap = new Map();
  for (const tx of transactions) {
    const dayKey = tx.occurredAt.toISOString().slice(0, 10);
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        date: dayKey,
        purchases: 0,
        transfersIn: 0,
        transfersOut: 0,
        assigned: 0,
        expended: 0,
      });
    }
    const day = dailyMap.get(dayKey);
    switch (tx.transactionType) {
      case 'PURCHASE':
        day.purchases += tx.quantity;
        break;
      case 'TRANSFER_IN':
        day.transfersIn += tx.quantity;
        break;
      case 'TRANSFER_OUT':
        day.transfersOut += Math.abs(tx.quantity);
        break;
      case 'ASSIGNMENT':
        day.assigned += Math.abs(tx.quantity);
        break;
      case 'ASSIGNMENT_RETURN':
        day.assigned = Math.max(0, day.assigned - tx.quantity);
        break;
      case 'EXPENDITURE':
        day.expended += Math.abs(tx.quantity);
        break;
      default:
        break;
    }
  }

  return {
    breakdown: {
      purchases: totals.purchases,
      transfersIn: totals.transfersIn,
      transfersOut: totals.transfersOut,
      netMovement: totals.netMovement,
    },
    trends: Array.from(dailyMap.values()),
    recentTransactions: transactions.slice(-15).reverse(),
  };
}

export async function getDashboardInventory(query) {
  const { page, limit, skip } = parsePagination(query);
  const { rows, totals } = await computeInventoryRows({
    baseId: query.baseId || null,
    category: query.category || null,
    equipmentTypeId: query.equipmentTypeId || null,
    search: query.search || null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
  });

  const allowedSortFields = new Set([
    'equipmentName',
    'category',
    'baseName',
    'openingBalance',
    'purchases',
    'transfersIn',
    'transfersOut',
    'netMovement',
    'assigned',
    'expended',
    'closingBalance',
    'availableQuantity',
  ]);
  const sortBy = allowedSortFields.has(query.sortBy) ? query.sortBy : 'equipmentName';
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;

  const sorted = [...rows].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * sortOrder;
    }
    return String(valA).localeCompare(String(valB)) * sortOrder;
  });

  const paged = sorted.slice(skip, skip + limit);

  return {
    items: paged,
    totals,
    pagination: buildPaginationMeta({ page, limit, total: sorted.length }),
  };
}

export async function getDashboardReports({
  baseId = null,
  category = null,
  equipmentTypeId = null,
  startDate = null,
  endDate = null,
}) {
  const { startDate: parsedStart, endDate: parsedEnd } = normalizeDateRange(startDate, endDate);
  const { rows } = await computeInventoryRows({
    baseId,
    category,
    equipmentTypeId,
    startDate,
    endDate,
  });

  const categoryMap = new Map();
  const baseMap = new Map();

  for (const row of rows) {
    if (!categoryMap.has(row.category)) {
      categoryMap.set(row.category, {
        category: row.category,
        openingBalance: 0,
        purchases: 0,
        transfersIn: 0,
        transfersOut: 0,
        assigned: 0,
        expended: 0,
        closingBalance: 0,
        availableQuantity: 0,
      });
    }
    const cat = categoryMap.get(row.category);
    cat.openingBalance += row.openingBalance;
    cat.purchases += row.purchases;
    cat.transfersIn += row.transfersIn;
    cat.transfersOut += row.transfersOut;
    cat.assigned += row.assigned;
    cat.expended += row.expended;
    cat.closingBalance += row.closingBalance;
    cat.availableQuantity += row.availableQuantity;

    if (!baseMap.has(row.baseId)) {
      baseMap.set(row.baseId, {
        baseId: row.baseId,
        baseName: row.baseName,
        openingBalance: 0,
        purchases: 0,
        transfersIn: 0,
        transfersOut: 0,
        assigned: 0,
        expended: 0,
        closingBalance: 0,
        availableQuantity: 0,
      });
    }
    const b = baseMap.get(row.baseId);
    b.openingBalance += row.openingBalance;
    b.purchases += row.purchases;
    b.transfersIn += row.transfersIn;
    b.transfersOut += row.transfersOut;
    b.assigned += row.assigned;
    b.expended += row.expended;
    b.closingBalance += row.closingBalance;
    b.availableQuantity += row.availableQuantity;
  }

  const purchaseWhere = {};
  const expenditureWhere = {};
  const transferWhere = {};

  if (baseId) {
    purchaseWhere.baseId = baseId;
    expenditureWhere.baseId = baseId;
    transferWhere.OR = [{ sourceBaseId: baseId }, { destinationBaseId: baseId }];
  }
  if (equipmentTypeId) {
    purchaseWhere.equipmentTypeId = equipmentTypeId;
    expenditureWhere.equipmentTypeId = equipmentTypeId;
    transferWhere.equipmentTypeId = equipmentTypeId;
  } else if (category) {
    purchaseWhere.equipmentType = { category };
    expenditureWhere.equipmentType = { category };
    transferWhere.equipmentType = { category };
  }

  if (parsedStart || parsedEnd) {
    purchaseWhere.purchaseDate = {};
    expenditureWhere.expenditureDate = {};
    transferWhere.createdAt = {};
    if (parsedStart) {
      purchaseWhere.purchaseDate.gte = parsedStart;
      expenditureWhere.expenditureDate.gte = parsedStart;
      transferWhere.createdAt.gte = parsedStart;
    }
    if (parsedEnd) {
      purchaseWhere.purchaseDate.lte = parsedEnd;
      expenditureWhere.expenditureDate.lte = parsedEnd;
      transferWhere.createdAt.lte = parsedEnd;
    }
  }

  const [recentPurchases, recentTransfers, recentExpenditures] = await Promise.all([
    prisma.purchase.findMany({
      where: purchaseWhere,
      take: 10,
      orderBy: { purchaseDate: 'desc' },
      include: {
        base: { select: { id: true, name: true } },
        equipmentType: { select: { id: true, name: true, category: true, unit: true } },
      },
    }),
    prisma.transfer.findMany({
      where: transferWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceBase: { select: { id: true, name: true } },
        destinationBase: { select: { id: true, name: true } },
        equipmentType: { select: { id: true, name: true, category: true, unit: true } },
      },
    }),
    prisma.expenditure.findMany({
      where: expenditureWhere,
      take: 10,
      orderBy: { expenditureDate: 'desc' },
      include: {
        base: { select: { id: true, name: true } },
        equipmentType: { select: { id: true, name: true, category: true, unit: true } },
      },
    }),
  ]);

  return {
    byCategory: Array.from(categoryMap.values()),
    byBase: Array.from(baseMap.values()),
    recentPurchases,
    recentTransfers,
    recentExpenditures,
  };
}

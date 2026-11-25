import { z } from 'zod';

const uuidSchema = z.string().uuid('Must be a valid UUID');
const optionalUuid = z.string().uuid().optional().or(z.literal('').transform(() => undefined));
const positiveInt = z.coerce.number().int('Quantity must be an integer').positive('Quantity must be greater than zero');

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid username characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER']),
  baseId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER']).optional(),
  baseId: uuidSchema.nullable().optional(),
  password: z.string().min(8).max(128).optional(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const createBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateBaseSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  location: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(['VEHICLE', 'WEAPON', 'AMMUNITION', 'OTHER']),
  description: z.string().trim().max(500).optional().nullable(),
  unit: z.string().trim().min(1).max(30).default('UNITS'),
  isActive: z.boolean().optional(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.enum(['VEHICLE', 'WEAPON', 'AMMUNITION', 'OTHER']).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  unit: z.string().trim().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
});

export const createPurchaseSchema = z.object({
  baseId: uuidSchema,
  equipmentTypeId: uuidSchema,
  quantity: positiveInt,
  purchaseDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid purchaseDate'),
  referenceNumber: z.string().trim().min(2).max(80),
  supplier: z.string().trim().min(2).max(120),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createTransferSchema = z
  .object({
    sourceBaseId: uuidSchema,
    destinationBaseId: uuidSchema,
    equipmentTypeId: uuidSchema,
    quantity: positiveInt,
    referenceNumber: z.string().trim().min(2).max(80),
    remarks: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => data.sourceBaseId !== data.destinationBaseId, {
    message: 'Source base and destination base must be different',
    path: ['destinationBaseId'],
  });

export const transferActionSchema = z.object({
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createAssignmentSchema = z.object({
  baseId: uuidSchema.optional(),
  equipmentTypeId: uuidSchema,
  quantity: positiveInt,
  assignedTo: z.string().trim().min(2).max(120),
  assignmentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid assignmentDate'),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const updateAssignmentSchema = z.object({
  status: z.enum(['ACTIVE', 'RETURNED']).optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createExpenditureSchema = z.object({
  baseId: uuidSchema.optional(),
  equipmentTypeId: uuidSchema,
  quantity: positiveInt,
  expenditureDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid expenditureDate'),
  reason: z.string().trim().min(2).max(200),
  referenceNumber: z.string().trim().min(2).max(80),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const adminAdjustmentSchema = z.object({
  baseId: uuidSchema,
  equipmentTypeId: uuidSchema,
  quantityDelta: z.coerce.number().int().refine((v) => v !== 0, 'Adjustment delta cannot be zero'),
  reason: z.string().trim().min(5).max(300),
  occurredAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid occurredAt').optional(),
});

export const dashboardFilterQuerySchema = z.object({
  baseId: optionalUuid,
  category: z.enum(['VEHICLE', 'WEAPON', 'AMMUNITION', 'OTHER']).optional().or(z.literal('').transform(() => undefined)),
  equipmentTypeId: optionalUuid,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

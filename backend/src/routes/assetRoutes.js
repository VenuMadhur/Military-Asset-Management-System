import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as assetController from '../controllers/assetController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createAssignmentSchema,
  createExpenditureSchema,
  dashboardFilterQuerySchema,
  idParamSchema,
  updateAssignmentSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  assetController.getInventory
);
router.get(
  '/summary',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  assetController.getSummary
);
router.get(
  '/movements',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  assetController.getMovements
);

router.get(
  '/assignments',
  authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER),
  enforceBaseScope(),
  assetController.listAssignments
);
router.post(
  '/assignments',
  authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER),
  enforceBaseScope({ forceBodyBaseId: true }),
  validate({ body: createAssignmentSchema }),
  assetController.createAssignment
);
router.put(
  '/assignments/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER),
  validate({ params: idParamSchema, body: updateAssignmentSchema }),
  assetController.updateAssignment
);

router.get(
  '/expenditures',
  authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER),
  enforceBaseScope(),
  assetController.listExpenditures
);
router.post(
  '/expenditures',
  authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER),
  enforceBaseScope({ forceBodyBaseId: true }),
  validate({ body: createExpenditureSchema }),
  assetController.createExpenditure
);

export default router;

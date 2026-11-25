import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { adminAdjustmentSchema, dashboardFilterQuerySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/summary',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  dashboardController.getSummary
);
router.get(
  '/movements',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  dashboardController.getMovements
);
router.get(
  '/inventory',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  dashboardController.getInventory
);
router.get(
  '/reports',
  validate({ query: dashboardFilterQuerySchema }),
  enforceBaseScope({ allowGlobalLogistics: true }),
  dashboardController.getReports
);
router.post(
  '/adjustments',
  authorizeRoles(ROLES.ADMIN),
  validate({ body: adminAdjustmentSchema }),
  dashboardController.createAdjustment
);

export default router;

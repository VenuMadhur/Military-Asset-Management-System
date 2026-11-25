import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as expenditureController from '../controllers/expenditureController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createExpenditureSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER));

router.get('/', enforceBaseScope(), expenditureController.listExpenditures);
router.post(
  '/',
  enforceBaseScope({ forceBodyBaseId: true }),
  validate({ body: createExpenditureSchema }),
  expenditureController.createExpenditure
);

export default router;

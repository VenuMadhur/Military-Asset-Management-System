import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as purchaseController from '../controllers/purchaseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createPurchaseSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', enforceBaseScope({ allowGlobalLogistics: true }), purchaseController.listPurchases);
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.LOGISTICS_OFFICER),
  validate({ body: createPurchaseSchema }),
  purchaseController.createPurchase
);
router.get('/:id', validate({ params: idParamSchema }), purchaseController.getPurchaseById);

export default router;

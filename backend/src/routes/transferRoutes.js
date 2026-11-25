import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as transferController from '../controllers/transferController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createTransferSchema,
  idParamSchema,
  transferActionSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', transferController.listTransfers);
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.LOGISTICS_OFFICER),
  validate({ body: createTransferSchema }),
  transferController.createTransfer
);
router.put(
  '/:id/approve',
  validate({ params: idParamSchema, body: transferActionSchema }),
  transferController.approveTransfer
);
router.put(
  '/:id/dispatch',
  validate({ params: idParamSchema, body: transferActionSchema }),
  transferController.dispatchTransfer
);
router.put(
  '/:id/complete',
  validate({ params: idParamSchema, body: transferActionSchema }),
  transferController.completeTransfer
);
router.put(
  '/:id/reject',
  validate({ params: idParamSchema, body: transferActionSchema }),
  transferController.rejectTransfer
);
router.put(
  '/:id/cancel',
  validate({ params: idParamSchema, body: transferActionSchema }),
  transferController.cancelTransfer
);

export default router;

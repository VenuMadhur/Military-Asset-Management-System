import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as baseController from '../controllers/baseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createBaseSchema, idParamSchema, updateBaseSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', baseController.listBases);
router.post('/', authorizeRoles(ROLES.ADMIN), validate({ body: createBaseSchema }), baseController.createBase);
router.get(
  '/:id',
  validate({ params: idParamSchema }),
  enforceBaseScope({ paramName: 'id', allowGlobalLogistics: true }),
  baseController.getBaseById
);
router.put(
  '/:id',
  authorizeRoles(ROLES.ADMIN),
  validate({ params: idParamSchema, body: updateBaseSchema }),
  baseController.updateBase
);

export default router;

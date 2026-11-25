import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as equipmentController from '../controllers/equipmentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createEquipmentSchema,
  idParamSchema,
  updateEquipmentSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', equipmentController.listEquipment);
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN),
  validate({ body: createEquipmentSchema }),
  equipmentController.createEquipment
);
router.get('/:id', validate({ params: idParamSchema }), equipmentController.getEquipmentById);
router.put(
  '/:id',
  authorizeRoles(ROLES.ADMIN),
  validate({ params: idParamSchema, body: updateEquipmentSchema }),
  equipmentController.updateEquipment
);

export default router;

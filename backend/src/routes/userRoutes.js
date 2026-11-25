import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createUserSchema,
  idParamSchema,
  updateUserSchema,
  userStatusSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(ROLES.ADMIN));

router.get('/', userController.listUsers);
router.post('/', validate({ body: createUserSchema }), userController.createUser);
router.put('/:id', validate({ params: idParamSchema, body: updateUserSchema }), userController.updateUser);
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: userStatusSchema }),
  userController.updateUserStatus
);

export default router;

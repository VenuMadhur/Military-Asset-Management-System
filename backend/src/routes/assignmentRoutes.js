import { Router } from 'express';
import { ROLES } from '../config/policies.js';
import * as assignmentController from '../controllers/assignmentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createAssignmentSchema,
  idParamSchema,
  updateAssignmentSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.BASE_COMMANDER));

router.get('/', enforceBaseScope(), assignmentController.listAssignments);
router.post(
  '/',
  enforceBaseScope({ forceBodyBaseId: true }),
  validate({ body: createAssignmentSchema }),
  assignmentController.createAssignment
);
router.put(
  '/:id',
  validate({ params: idParamSchema, body: updateAssignmentSchema }),
  assignmentController.updateAssignment
);

export default router;

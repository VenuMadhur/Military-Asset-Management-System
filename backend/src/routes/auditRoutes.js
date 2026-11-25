import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { enforceBaseScope } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', enforceBaseScope({ allowGlobalLogistics: true }), auditController.listAuditLogs);

export default router;

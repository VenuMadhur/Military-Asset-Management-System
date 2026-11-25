import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { loginSchema } from '../validators/schemas.js';

const router = Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

export default router;

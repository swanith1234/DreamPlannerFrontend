// src/modules/notification/notification.route.ts
import { Router, Request, Response, NextFunction } from 'express';
import { notificationController } from './notification.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  notificationController.list(req, res).catch(next);
});

export default router;
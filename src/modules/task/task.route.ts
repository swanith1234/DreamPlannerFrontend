import { Router, Request, Response, NextFunction } from 'express';
import { taskController } from './task.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  taskController.create(req, res).catch(next);
});

router.patch('/:taskId', (req: Request, res: Response, next: NextFunction) => {
  taskController.update(req, res).catch(next);
});

router.post('/:taskId/complete', (req: Request, res: Response, next: NextFunction) => {
  taskController.complete(req, res).catch(next);
});

router.post('/:taskId/block', (req: Request, res: Response, next: NextFunction) => {
  taskController.block(req, res).catch(next);
});

router.get('/:taskId', (req: Request, res: Response, next: NextFunction) => {
  taskController.get(req, res).catch(next);
});

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  taskController.list(req, res).catch(next);
});

export default router;
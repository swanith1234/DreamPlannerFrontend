import { Response } from 'express';
import { AuthRequest } from '../../types';
import { notificationService } from './notification.service';

export class NotificationController {
  async list(req: AuthRequest, res: Response) {
    try {
      const notifications = await notificationService.listNotifications(
        req.userId!
      );
      res.status(200).json({ notifications });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const notificationController = new NotificationController();
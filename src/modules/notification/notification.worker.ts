// src/modules/notification/notification.worker.ts
import { logger } from '../../utils/logger';
import { notificationService } from './notification.service';
import { notificationScheduler } from './notification.scheduler';

export class NotificationWorker {
  private pollInterval = 60 * 1000; // 1 minute (60 seconds)
  private running = false;
  private pollTimeout: NodeJS.Timeout | null = null;

  /**
   * Start the notification worker
   * Runs independently from event worker
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await logger.info('notification', 'Notification worker started', {
      pollInterval: `${this.pollInterval / 1000} seconds`,
    });

    this.poll();
  }

  /**
   * Stop the notification worker
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    await logger.info('notification', 'Notification worker stopped');
  }

  /**
   * Main polling loop
   * Runs every minute (60 seconds)
   */
  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // Get all due notifications
      const dueNotifications = await notificationService.getDueNotifications();
console.log("dueNotifications:", dueNotifications);
      if (dueNotifications.length > 0) {
        await logger.info(
          'notification',
          `Processing ${dueNotifications.length} due notifications`,
          { count: dueNotifications.length }
        );

        // Process each notification
        for (const notification of dueNotifications) {
          await this.processNotification(notification);
        }
      }
    } catch (error: any) {
      await logger.error('notification', 'Notification worker poll failed', {
        error: error.message,
      });
    }

    // Schedule next poll
    this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
  }

  /**
   * Process a single notification
   * 1. Send notification (console/log for MVP, can extend to email/SMS/push)
   * 2. Mark as SENT
   * 3. Schedule next reminder (if conditions valid)
   */
  private async processNotification(notification: any): Promise<void> {
    try {
      const { id, userId, taskId, dreamId, message, type, task, user } = notification;

      // STEP 1: Send notification
      await this.sendNotification({
        userId,
        taskId,
        message,
        type,
        scheduledAt: notification.scheduledAt,
      });

      // STEP 2: Mark as SENT
      await notificationService.markNotificationSent(id);

      await logger.info(
        'notification',
        'Notification sent and marked',
        {
          notificationId: id,
          type,
          userId,
          taskId,
        },
        userId
      );

      // STEP 3: Schedule next reminder (only for task reminders, not motivational)
      if (taskId && type === 'REMINDER' && task) {
        // Check if task is still active
        if (task.status === 'COMPLETED' || task.status === 'BLOCKED') {
          await logger.info(
            'notification',
            'Task not active, skipping next reminder',
            { taskId, status: task.status },
            userId
          );
          return;
        }

        // Check if deadline hasn't passed
        const now = new Date();
        if (now >= task.deadline) {
          await logger.info(
            'notification',
            'Deadline passed, no more reminders',
            { taskId, deadline: task.deadline.toISOString() },
            userId
          );
          return;
        }

        // Schedule next frequency-based reminder
        await notificationService.scheduleNextReminder(
          userId,
          taskId,
          dreamId,
          task.deadline
        );
      }
    } catch (error: any) {
      await logger.error('notification', 'Failed to process notification', {
        error: error.message,
        notificationId: notification.id,
      });

      // Optionally mark as FAILED instead of retrying
      // await notificationService.markNotificationFailed(notification.id);
    }
  }

  /**
   * Send notification (MVP: console log + structured logging)
   * Future: extend with email, SMS, push, Slack, etc.
   *
   * This is production-ready because:
   * 1. Loosely coupled - easy to add new channels
   * 2. Structured logging - can be queried later
   * 3. No external dependencies - works instantly
   * 4. Free of cost - using console/logs
   */
  private async sendNotification(options: {
    userId: string;
    taskId?: string;
    message: string;
    type: string;
    scheduledAt: Date;
  }): Promise<void> {
    const { userId, taskId, message, type, scheduledAt } = options;

    // MVP: Console log (free, instant)
    console.log(
      `[NOTIFICATION] [${type}] [${new Date().toISOString()}] ${message} (User: ${userId})`
    );

    // Log to database for tracking
    await logger.info(
      'notification',
      `[SEND] ${type}: ${message}`,
      {
        userId,
        taskId,
        scheduledAt: scheduledAt.toISOString(),
      },
      userId
    );

    // FUTURE EXTENSIONS (no-op for MVP):
    // await this.sendEmail(userId, message);
    // await this.sendSMS(userId, message);
    // await this.sendPush(userId, message);
    // await this.sendSlack(userId, message);
    // await this.sendTelegram(userId, message);
  }

  // ============================================================
  // FUTURE: Notification channels (just stubs for now)
  // ============================================================

  // private async sendEmail(userId: string, message: string): Promise<void> {
  //   // TODO: Integrate with SendGrid, AWS SES, etc.
  // }

  // private async sendSMS(userId: string, message: string): Promise<void> {
  //   // TODO: Integrate with Twilio, AWS SNS, etc.
  // }

  // private async sendPush(userId: string, message: string): Promise<void> {
  //   // TODO: Integrate with Firebase, OneSignal, etc.
  // }

  // private async sendSlack(userId: string, message: string): Promise<void> {
  //   // TODO: Integrate with Slack API
  // }

  // private async sendTelegram(userId: string, message: string): Promise<void> {
  //   // TODO: Integrate with Telegram Bot API
  // }
}

export const notificationWorker = new NotificationWorker();
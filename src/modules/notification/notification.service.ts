// src/modules/notification/notification.service.ts
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { notificationScheduler, ScheduledNotification } from './notification.scheduler';
import { NotificationStatus } from '@prisma/client';
import { enqueueNotificationJob } from './queue';
import { generateNotificationMessageWithLLM } from './llm-provider';

export class NotificationService {
  /**
   * Create a single notification and enqueue to BullMQ
   * 
   * IMPORTANT: DB write MUST happen before queue enqueue
   * This ensures notification exists when worker processes job
   */
  async createNotification(
    userId: string,
    dreamId: string | null,
    taskId: string | null,
    notification: ScheduledNotification
  ): Promise<any> {
    try {
      // STEP 1: Generate message using LLM
      let message = notification.message;
      
      // If message is empty, generate from LLM
      if (!message || message.trim().length === 0) {
        try {
          // Get user with preferences and task/dream context
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { preferences: true },
          });

          const task = taskId ? await prisma.task.findUnique({ where: { id: taskId } }) : null;
          const dream = dreamId ? await prisma.dream.findUnique({ where: { id: dreamId } }) : null;

          if (user?.preferences) {
            message = await generateNotificationMessageWithLLM({
              notificationType: notification.type,
              userTone: user.preferences.motivationTone,
              task,
              dream,
            });
          }
        } catch (llmError: any) {
          await logger.warn('notification', 'LLM message generation failed, using default', {
            error: llmError.message,
          });
          // Fallback to default message
          message = notification.message || 'You have a notification from DreamPlanner';
        }
      }

      // STEP 2: Save notification to DB (SCHEDULED status)
      const created = await prisma.notification.create({
        data: {
          userId,
          dreamId,
          taskId,
          type: notification.type,
          message,
          scheduledAt: notification.scheduledAt,
          status: NotificationStatus.SCHEDULED,
        },
      });

      // STEP 3: Enqueue to BullMQ with delay
      const now = new Date();
      const delayMs = Math.max(notification.scheduledAt.getTime() - now.getTime(), 0);

      try {
        await enqueueNotificationJob(created.id, delayMs);
      } catch (queueError: any) {
        // If queue fails, still mark as created (worker can pick it up on restart)
        await logger.error('notification', 'Failed to enqueue notification job', {
          error: queueError.message,
          notificationId: created.id,
        });
      }

      await logger.info(
        'notification',
        'Notification created and queued',
        {
          notificationId: created.id,
          taskId,
          scheduledAt: notification.scheduledAt.toISOString(),
          type: notification.type,
          delayMs,
        },
        userId
      );

      return created;
    } catch (error: any) {
      await logger.error('notification', 'Failed to create notification', {
        error: error.message,
        taskId,
      });
      throw error;
    }
  }

  /**
   * Schedule pre-start reminders when task is created
   * Called from task.created event handler
   */
  async schedulePreStartReminders(
    userId: string,
    taskId: string,
    dreamId: string,
    startDate: Date
  ): Promise<void> {
    try {
      // Get user with preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true },
      });

      if (!user?.preferences) {
        throw new Error('User preferences not found');
      }

      // Get pre-start reminders from scheduler
      const reminders = notificationScheduler.getPreStartReminders(startDate, user);

      // Create each reminder (each will be enqueued to BullMQ)
      for (const reminder of reminders) {
        await this.createNotification(userId, dreamId, taskId, reminder);
      }

      await logger.info(
        'notification',
        `Scheduled ${reminders.length} pre-start reminders`,
        { taskId, reminders: reminders.length },
        userId
      );
    } catch (error: any) {
      await logger.error('notification', 'Failed to schedule pre-start reminders', {
        error: error.message,
        taskId,
      });
    }
  }

  /**
   * Schedule next frequency-based reminder
   * Called by notification queue worker after successful dispatch
   */
  async scheduleNextReminder(
    userId: string,
    taskId: string,
    dreamId: string,
    deadline: Date
  ): Promise<void> {
    try {
      // Get task to verify it's still valid
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        await logger.warn('notification', 'Task not found for next reminder', { taskId }, userId);
        return;
      }

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

      // Check if deadline passed
      if (new Date() >= deadline) {
        await logger.info(
          'notification',
          'Deadline passed, no more reminders',
          { taskId, deadline: deadline.toISOString() },
          userId
        );
        return;
      }

      // Get user with preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preferences: true },
      });

      if (!user?.preferences) {
        throw new Error('User preferences not found');
      }

      // Compute next notification time (frequency-based)
      const nextNotif = notificationScheduler.computeNextNotificationTime(
        new Date(),
        user,
        deadline,
        true // isFrequencyBased = true
      );

      // If no valid next time, stop scheduling
      if (!nextNotif) {
        await logger.info(
          'notification',
          'No valid next notification time, stopping reminders',
          { taskId },
          userId
        );
        return;
      }

      // Create next notification (will be enqueued to BullMQ)
      await this.createNotification(userId, dreamId, taskId, nextNotif);

      await logger.info(
        'notification',
        'Next frequency-based reminder scheduled',
        {
          taskId,
          scheduledAt: nextNotif.scheduledAt.toISOString(),
        },
        userId
      );
    } catch (error: any) {
      await logger.error('notification', 'Failed to schedule next reminder', {
        error: error.message,
        taskId,
      });
    }
  }

  /**
   * Archive all future notifications for a task (on completion)
   */
  async archiveFutureNotifications(taskId: string, userId: string): Promise<void> {
    try {
      const archived = await prisma.notification.updateMany({
        where: {
          taskId,
          status: NotificationStatus.SCHEDULED,
        },
        data: {
          status: NotificationStatus.ARCHIVED,
        },
      });

      if (archived.count > 0) {
        await logger.info(
          'notification',
          `Archived ${archived.count} future notifications`,
          { taskId },
          userId
        );
      }
    } catch (error: any) {
      await logger.error('notification', 'Failed to archive notifications', {
        error: error.message,
        taskId,
      });
    }
  }

  /**
   * List user's recent notifications
   */
  async listNotifications(userId: string, limit: number = 50): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });
  }
}

export const notificationService = new NotificationService();
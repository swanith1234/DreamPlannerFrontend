// src/modules/notification/notification.service.ts
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { notificationScheduler, ScheduledNotification } from './notification.scheduler';
import { User, Task, NotificationStatus, MotivationTone } from '@prisma/client';

import { generateNotificationMessageWithLLM } from './llm-provider';

export class NotificationService {
  /**
   * Create a single notification
   */
  async createNotification(
    userId: string,
    dreamId: string | null,
    taskId: string | null,
    notification: ScheduledNotification
  ): Promise<any> {
    try {
      const created = await prisma.notification.create({
        data: {
          userId,
          dreamId,
          taskId,
          type: notification.type,
          message: notification.message,
          scheduledAt: notification.scheduledAt,
          status: NotificationStatus.SCHEDULED,
        },
      });

      await logger.info(
        'notification',
        'Notification created (just-in-time)',
        {
          notificationId: created.id,
          taskId,
          scheduledAt: notification.scheduledAt.toISOString(),
          type: notification.type,
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

      // Get pre-start reminders
      const reminders = notificationScheduler.getPreStartReminders(startDate, user);

      // Create each reminder
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
   * Called by notification worker after marking notification as SENT
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

      // -----------------------------------------------------------------------
      // [NEW] Generate dynamic message via LLM
      // -----------------------------------------------------------------------
      try {
        const taskWithCheckpoints = await prisma.task.findUnique({
          where: { id: taskId },
          include: { checkpoints: true }
        });

        const llmMessage = await generateNotificationMessageWithLLM({
          notificationType: 'REMINDER',
          userTone: user.preferences.motivationTone,
          task: taskWithCheckpoints,
          dream: await prisma.dream.findUnique({ where: { id: dreamId } }),
          timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
          // optimization: find today's checkpoint
          checkpoint: taskWithCheckpoints?.checkpoints.find(c => !c.isCompleted),
          progress: {
            current: task.progressPercent || 0,
            lastUpdated: task.lastProgressAt || undefined
          }
        });

        if (llmMessage) {
          nextNotif.message = llmMessage;
        }
      } catch (error) {
        // Fallback to static message inside nextNotif if LLM fails
        // Log is handled inside generateNotificationMessageWithLLM but we can debug log here
        console.log('LLM generation skipped/failed, using default');
      }
      // -----------------------------------------------------------------------

      // Create next notification
      await this.createNotification(userId, dreamId, taskId, nextNotif);

      await logger.info(
        'notification',
        'Next frequency-based reminder scheduled',
        {
          taskId,
          scheduledAt: nextNotif.scheduledAt.toISOString(),
          messageGenerated: !!nextNotif.message
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
   * Get due notifications (for worker)
   */
  async getDueNotifications(limit: number = 100): Promise<any[]> {

    return prisma.notification.findMany({
      where: {
        status: NotificationStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: {
        user: { include: { preferences: true, tasks: { select: { id: true } } } }, // Fetch basic user data + prefs
        task: {
          include: {
            checkpoints: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        dream: true,
      },
    });
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(notificationId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.SENT },
      });
    } catch (error: any) {
      await logger.error('notification', 'Failed to mark notification sent', {
        error: error.message,
        notificationId,
      });
    }
  }

  /**
   * Update notification message and metadata (e.g. after LLM generation)
   */
  async updateNotificationMessage(
    notificationId: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          message,
          metadata,
        },
      });
    } catch (error: any) {
      await logger.error('notification', 'Failed to update notification message', {
        error: error.message,
        notificationId,
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
// ============================================================
// REFACTORED NOTIFICATION SYSTEM - PRODUCTION READY
// ============================================================

// src/modules/notification/notification.scheduler.ts
import { User, Task } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface ScheduledNotification {
  scheduledAt: Date;
  message: string;
  type: 'REMINDER' | 'MOTIVATIONAL' | 'SYSTEM';
}

export class NotificationScheduler {
  /**
   * Compute next notification time based on user timezone and preferences
   * Respects sleep cycle (hard block) and quiet hours (soft block)
   */
  computeNextNotificationTime(
    baseTime: Date,
    user: User & { preferences: any },
    deadline: Date,
    isFrequencyBased: boolean = false
  ): ScheduledNotification | null {
    try {
      const userTz = user.timezone || 'UTC';
      const prefs = user.preferences;

      // Convert to user's timezone for calculations
      const baseLocal = this.toUserTime(baseTime, userTz);
      const deadlineLocal = this.toUserTime(deadline, userTz);

      // If deadline has passed, don't schedule
      if (baseLocal >= deadlineLocal) {
        return null;
      }

      let nextTime = new Date(baseLocal);

      // For frequency-based reminders, add frequency first
      if (isFrequencyBased) {
        nextTime.setMinutes(nextTime.getMinutes() + prefs.notificationFrequency);
      }

      // Check and adjust for sleep cycle (HARD BLOCK)
      nextTime = this.adjustForSleepCycle(nextTime, prefs.sleepStart, prefs.sleepEnd, userTz);

      // Check and adjust for quiet hours (SOFT BLOCK)
      nextTime = this.adjustForQuietHours(nextTime, prefs.quietHours, userTz);

      // Final check: ensure still before deadline
      if (nextTime >= deadlineLocal) {
        return null;
      }

      // Convert back to UTC for storage
      const utcTime = this.toUtcTime(nextTime, userTz);

      return {
        scheduledAt: utcTime,
        message: this.generateMessage(isFrequencyBased),
        type: 'REMINDER',
      };
    } catch (error: any) {
      logger.error('notification', 'Failed to compute notification time', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Schedule pre-start reminders (1 day before + day of)
   * Only called during task creation (before task starts)
   */
  getPreStartReminders(
  startDate: Date,
  user: User & { preferences: any }
): ScheduledNotification[] {
  const reminders: ScheduledNotification[] = [];
  const userTz = user.timezone || 'UTC';
  const nowUtc = new Date();

  const startLocal = this.toUserTime(startDate, userTz);
  const nowLocal = this.toUserTime(nowUtc, userTz);

  const diffMs = startLocal.getTime() - nowLocal.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 🔹 30 minutes before start (for ALL tasks if possible)
  if (diffMinutes > 30) {
    let thirtyMinBefore = new Date(startLocal);
    thirtyMinBefore.setMinutes(thirtyMinBefore.getMinutes() - 30);

    thirtyMinBefore = this.adjustForSleepCycle(
      thirtyMinBefore,
      user.preferences.sleepStart,
      user.preferences.sleepEnd,
      userTz
    );

    thirtyMinBefore = this.adjustForQuietHours(
      thirtyMinBefore,
      user.preferences.quietHours,
      userTz
    );

    reminders.push({
      scheduledAt: this.toUtcTime(thirtyMinBefore, userTz),
      message: `Reminder: Your task starts in 30 minutes`,
      type: 'REMINDER',
    });
  }

  // 🔹 1 day before ONLY if start is far away
  if (diffDays > 2) {
    let oneDayBefore = new Date(startLocal);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    oneDayBefore = this.adjustForSleepCycle(
      oneDayBefore,
      user.preferences.sleepStart,
      user.preferences.sleepEnd,
      userTz
    );

    oneDayBefore = this.adjustForQuietHours(
      oneDayBefore,
      user.preferences.quietHours,
      userTz
    );

    reminders.push({
      scheduledAt: this.toUtcTime(oneDayBefore, userTz),
      message: `Reminder: Your task starts tomorrow`,
      type: 'REMINDER',
    });
  }

  return reminders;
}


  /**
   * Adjust time to avoid sleep cycle (hard block)
   * If within sleep time, move to sleepEnd
   */
  private adjustForSleepCycle(
    time: Date,
    sleepStart: string,
    sleepEnd: string,
    timezone: string
  ): Date {
    const timeStr = this.formatTime(time);
    const [sleepStartH, sleepStartM] = sleepStart.split(':').map(Number);
    const [sleepEndH, sleepEndM] = sleepEnd.split(':').map(Number);
    const [timeH, timeM] = timeStr.split(':').map(Number);

    const timeMins = timeH * 60 + timeM;
    const sleepStartMins = sleepStartH * 60 + sleepStartM;
    const sleepEndMins = sleepEndH * 60 + sleepEndM;

    // Check if within sleep cycle
    let isInSleep = false;

    if (sleepStartMins > sleepEndMins) {
      // Sleep spans midnight (e.g., 23:30 - 06:30)
      isInSleep = timeMins >= sleepStartMins || timeMins < sleepEndMins;
    } else {
      // Sleep within same day
      isInSleep = timeMins >= sleepStartMins && timeMins < sleepEndMins;
    }

    if (isInSleep) {
      // Move to sleep end time
      const adjusted = new Date(time);
      adjusted.setHours(sleepEndH, sleepEndM, 0, 0);

      // If sleep end is early morning and current time is late night, it's next day
      if (sleepStartMins > sleepEndMins && timeMins >= sleepStartMins) {
        adjusted.setDate(adjusted.getDate() + 1);
      }

      return adjusted;
    }

    return time;
  }

  /**
   * Adjust time to avoid quiet hours (soft block)
   * If within quiet hour, move to quiet hour end
   */
  private adjustForQuietHours(
    time: Date,
    quietHours: Array<{ start: string; end: string }>,
    timezone: string
  ): Date {
    if (!Array.isArray(quietHours) || quietHours.length === 0) {
      return time;
    }

    const timeStr = this.formatTime(time);
    const [timeH, timeM] = timeStr.split(':').map(Number);
    const timeMins = timeH * 60 + timeM;

    for (const period of quietHours) {
      const [startH, startM] = period.start.split(':').map(Number);
      const [endH, endM] = period.end.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      // Check if time is within this quiet hour period
      if (timeMins >= startMins && timeMins < endMins) {
        // Move to end of quiet hour
        const adjusted = new Date(time);
        adjusted.setHours(endH, endM, 0, 0);
        return adjusted;
      }
    }

    return time;
  }

  /**
   * Convert UTC time to user's local time
   */
private toUserTime(date: Date, timezone: string): Date {
  return new Date(
    date.toLocaleString('en-US', { timeZone: timezone })
  );
}


  /**
   * Convert local time back to UTC
   */
 private toUtcTime(localTime: Date, timezone: string): Date {
  // Interpret the localTime as if it belongs to the given timezone
  const tzInterpreted = new Date(
    localTime.toLocaleString('en-US', { timeZone: timezone })
  );

  // Calculate the offset between interpreted time and actual time
  const offset = tzInterpreted.getTime() - localTime.getTime();

  // Remove offset to get true UTC
  return new Date(localTime.getTime() - offset);
}



  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Generate notification message
   */
  private generateMessage(isFrequencyBased: boolean): string {
    if (isFrequencyBased) {
      return 'Reminder: Keep making progress on your task!';
    }
    return 'Reminder: You have an upcoming task';
  }
}

export const notificationScheduler = new NotificationScheduler();
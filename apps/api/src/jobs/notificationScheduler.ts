import cron from 'node-cron';
import { notificationService } from '../services/notificationService.js';

let isRunning = false;

export function initNotificationScheduler(): void {
  // Run every 5 minutes as configured
  cron.schedule('*/5 * * * *', async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;
    try {
      const processed = await notificationService.processDueNotifications();
      if (processed > 0) {
        console.log(`[NotificationScheduler] Successfully processed ${processed} due push reminders.`);
      }
    } catch (err) {
      console.error('[NotificationScheduler] Worker execution error:', err);
    } finally {
      isRunning = false;
    }
  });

  console.log('[NotificationScheduler] Scheduled MongoDB-backed push notification worker (every 5 minutes)');
}

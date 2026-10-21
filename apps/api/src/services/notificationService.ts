import { notificationRepository } from '../repositories/notificationRepository.js';
import { institutionRepository } from '../repositories/institutionRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { rosterRepository } from '../repositories/rosterRepository.js';
import { departmentRepository } from '../repositories/departmentRepository.js';
import { batchRepository } from '../repositories/batchRepository.js';
import { webpush } from '../config/vapid.js';
import {
  getDayBefore,
  resolveAgenda
} from '../shared/index.js';

export class NotificationService {
  async registerSubscription(
    userId: string,
    institutionId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
  ): Promise<void> {
    await notificationRepository.saveSubscription({
      userId,
      institutionId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: subscription.userAgent
    });
  }

  async unregisterSubscription(endpoint: string): Promise<void> {
    await notificationRepository.removeSubscription(endpoint);
  }

  async cancelEventsForVersion(scheduleVersionId: string): Promise<void> {
    await notificationRepository.cancelFutureEventsForVersion(scheduleVersionId);
  }

  /**
   * Generates reminder events in MongoDB for all registered members when a schedule is published
   */
  async generateEventsForPublishedSchedule(institutionId: string, scheduleVersionId: string): Promise<void> {
    const { items: memberships } = await institutionRepository.listMembershipsByInstitution(institutionId, {
      pageSize: 1000
    });

    const activeMembers = memberships.filter((m) => m.defaultScheduleRecordId);
    if (activeMembers.length === 0) return;

    const [tracks, periods, assignments, departments, batches] = await Promise.all([
      scheduleRepository.findTracksByVersion(scheduleVersionId),
      scheduleRepository.findPeriodsByVersion(scheduleVersionId),
      scheduleRepository.findAssignmentsByVersion(scheduleVersionId),
      departmentRepository.getAllActiveByInstitution(institutionId),
      batchRepository.getAllByInstitution(institutionId)
    ]);

    const batchMap = new Map<string, any>(batches.map((b) => [b._id.toString(), {
      id: b._id.toString(),
      code: b.code,
      name: b.name,
      depth: b.depth,
      ancestorIds: (b.ancestorIds || []).map((a: any) => a.toString())
    }]));

    const departmentMap = new Map<string, any>(departments.map((d) => [d._id.toString(), {
      id: d._id.toString(),
      name: d.name,
      abbreviation: d.abbreviation,
      color: d.color
    }]));

    const now = new Date();
    const todayKolkata = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const eventsToCreate: any[] = [];

    for (const membership of activeMembers) {
      const rosterId = (membership.defaultScheduleRecordId as any)._id || membership.defaultScheduleRecordId;
      const rosterRecord = await rosterRepository.findById(rosterId.toString());
      if (!rosterRecord) continue;

      const rosterBatchIds = (rosterRecord.batchNodeIds || []).map((b: any) => (b._id ? b._id.toString() : b.toString()));

      // Resolve upcoming agenda
      const agenda = resolveAgenda(
        {
          rosterBatchNodeIds: rosterBatchIds,
          batchMap,
          tracks: tracks.map((t) => ({
            id: t._id.toString(),
            scheduleVersionId: t.scheduleVersionId.toString(),
            name: t.name,
            order: t.order,
            inheritParentAssignments: t.inheritParentAssignments,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString()
          })),
          periods: periods.map((p) => ({
            id: p._id.toString(),
            scheduleVersionId: p.scheduleVersionId.toString(),
            rotationTrackId: p.rotationTrackId.toString(),
            startDate: p.startDate,
            endDate: p.endDate,
            order: p.order,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString()
          })),
          assignments: assignments.map((a) => ({
            id: a._id.toString(),
            scheduleVersionId: a.scheduleVersionId.toString(),
            rotationTrackId: a.rotationTrackId.toString(),
            periodId: a.periodId.toString(),
            departmentId: a.departmentId.toString(),
            batchNodeId: a.batchNodeId.toString(),
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString()
          })),
          departmentMap
        },
        todayKolkata
      );

      const prefs = membership.notificationPreferences || {
        postingEndReminder: true,
        postingStartNotification: true,
        reminderTimeEnd: '19:00',
        reminderTimeStart: '07:00',
        hideDepartmentNameOnLockScreen: false
      };

      for (const posting of agenda) {
        // 1. Posting End Reminder: Day before inclusive end date at configured reminder time
        if (prefs.postingEndReminder) {
          const reminderDateStr = getDayBefore(posting.endDate);
          const [endH, endM] = (prefs.reminderTimeEnd || '19:00').split(':').map(Number);

          // Convert Kolkata time to UTC Date for MongoDB scheduler
          const scheduledDate = new Date(`${reminderDateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00+05:30`);

          if (scheduledDate > now) {
            eventsToCreate.push({
              userId: membership.userId,
              institutionMembershipId: membership._id,
              defaultScheduleRecordId: rosterRecord._id,
              scheduleVersionId,
              eventType: 'posting_end_reminder',
              scheduledFor: scheduledDate,
              status: 'pending',
              idempotencyKey: `${membership.userId}_${scheduleVersionId}_${posting.startDate}_${posting.endDate}_${posting.departmentId}_end`
            });
          }
        }

        // 2. Posting Start Notification: On first day of new posting at configured reminder time
        if (prefs.postingStartNotification) {
          const [startH, startM] = (prefs.reminderTimeStart || '07:00').split(':').map(Number);
          const scheduledDate = new Date(`${posting.startDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00+05:30`);

          if (scheduledDate > now) {
            eventsToCreate.push({
              userId: membership.userId,
              institutionMembershipId: membership._id,
              defaultScheduleRecordId: rosterRecord._id,
              scheduleVersionId,
              eventType: 'posting_start_notification',
              scheduledFor: scheduledDate,
              status: 'pending',
              idempotencyKey: `${membership.userId}_${scheduleVersionId}_${posting.startDate}_${posting.endDate}_${posting.departmentId}_start`
            });
          }
        }
      }
    }

    if (eventsToCreate.length > 0) {
      await notificationRepository.createNotificationEvents(eventsToCreate);
    }
  }

  /**
   * Worker job called every 5 minutes by node-cron to process due push reminders
   */
  async processDueNotifications(): Promise<number> {
    const events = await notificationRepository.claimDueEvents(50);
    if (events.length === 0) return 0;

    let processedCount = 0;

    for (const event of events) {
      try {
        const userId = event.userId._id ? event.userId._id.toString() : event.userId.toString();
        const membership: any = event.institutionMembershipId;
        const institutionId = membership?.institutionId ? membership.institutionId.toString() : '';

        const subscriptions = await notificationRepository.findValidSubscriptionsByUser(userId, institutionId);
        if (subscriptions.length === 0) {
          // No active push subscriptions; mark sent to prevent retry loop
          await notificationRepository.markEventSent(event._id);
          continue;
        }

        const hideDept = membership?.notificationPreferences?.hideDepartmentNameOnLockScreen || false;
        let title = 'Posting Update';
        let body = 'You have an upcoming schedule change.';

        if (event.eventType === 'posting_end_reminder') {
          title = 'Posting Ending Tomorrow';
          body = hideDept ? 'Your current posting ends tomorrow.' : 'Your clinical posting ends tomorrow.';
        } else if (event.eventType === 'posting_start_notification') {
          title = 'New Posting Beginning Today';
          body = hideDept ? 'Your new clinical posting begins today.' : 'Your new clinical rotation begins today.';
        }

        const payload = JSON.stringify({
          title,
          body,
          url: '/',
          eventType: event.eventType,
          tag: event.eventType
        });

        // Send to all registered devices for this user
        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: sub.keys
              },
              payload
            );
          } catch (pushErr: any) {
            // Check for subscription expired (410 Gone or 404 Not Found)
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
              await notificationRepository.markSubscriptionInvalid(sub.endpoint);
            }
          }
        }

        await notificationRepository.markEventSent(event._id);
        processedCount++;
      } catch (err: any) {
        await notificationRepository.markEventFailed(event._id, err.message || 'Push failure', true);
      }
    }

    return processedCount;
  }
}

export const notificationService = new NotificationService();

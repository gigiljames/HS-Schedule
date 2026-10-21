import { PushSubscriptionModel, IPushSubscriptionDocument } from '../models/PushSubscription.js';
import { NotificationEventModel, INotificationEventDocument } from '../models/NotificationEvent.js';
import { Types } from 'mongoose';

export class NotificationRepository {
  // Push subscriptions
  async saveSubscription(data: {
    userId: string;
    institutionId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }): Promise<IPushSubscriptionDocument> {
    return PushSubscriptionModel.findOneAndUpdate(
      { endpoint: data.endpoint },
      { $set: { ...data, isValid: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async removeSubscription(endpoint: string): Promise<void> {
    await PushSubscriptionModel.deleteOne({ endpoint });
  }

  async markSubscriptionInvalid(endpoint: string): Promise<void> {
    await PushSubscriptionModel.updateOne({ endpoint }, { $set: { isValid: false } });
  }

  async findValidSubscriptionsByUser(userId: string, institutionId: string): Promise<IPushSubscriptionDocument[]> {
    return PushSubscriptionModel.find({ userId, institutionId, isValid: true });
  }

  // Notification events
  async createNotificationEvents(events: Partial<INotificationEventDocument>[]): Promise<void> {
    if (events.length === 0) return;
    try {
      await NotificationEventModel.insertMany(events, { ordered: false });
    } catch (err: any) {
      // Ignore duplicate key errors (code 11000) for idempotency
      if (err.code !== 11000 && !err.writeErrors) {
        throw err;
      }
    }
  }

  async cancelFutureEventsForVersion(scheduleVersionId: string): Promise<void> {
    await NotificationEventModel.updateMany(
      { scheduleVersionId, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );
  }

  async cancelEventsForMembership(membershipId: string): Promise<void> {
    await NotificationEventModel.updateMany(
      { institutionMembershipId: membershipId, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );
  }

  /**
   * Atomically claim pending events that are due (scheduledFor <= now)
   */
  async claimDueEvents(maxCount = 50): Promise<INotificationEventDocument[]> {
    const now = new Date();
    // Find IDs first
    const pending = await NotificationEventModel.find({
      status: 'pending',
      scheduledFor: { $lte: now }
    })
      .limit(maxCount)
      .select('_id');

    if (pending.length === 0) return [];

    const ids = pending.map((p) => p._id);

    // Atomically transition status to processing
    await NotificationEventModel.updateMany(
      { _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'processing' }, $inc: { attemptCount: 1 } }
    );

    return NotificationEventModel.find({ _id: { $in: ids }, status: 'processing' })
      .populate('userId', 'displayName email')
      .populate('defaultScheduleRecordId', 'name')
      .populate('institutionMembershipId');
  }

  async markEventSent(id: string | Types.ObjectId): Promise<void> {
    await NotificationEventModel.findByIdAndUpdate(id, {
      $set: { status: 'sent', sentAt: new Date() }
    });
  }

  async markEventFailed(id: string | Types.ObjectId, error: string, retryable = true): Promise<void> {
    const event = await NotificationEventModel.findById(id);
    if (!event) return;

    // Retry up to 3 times
    const nextStatus = retryable && event.attemptCount < 3 ? 'pending' : 'failed';
    await NotificationEventModel.findByIdAndUpdate(id, {
      $set: { status: nextStatus, lastError: error }
    });
  }
}

export const notificationRepository = new NotificationRepository();

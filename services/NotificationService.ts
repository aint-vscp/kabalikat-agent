import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type Importance,
  type LocalNotificationSchema,
  type Visibility,
} from '@capacitor/local-notifications';
import { type LifeEvent } from '../types';
import { nativeBridgeService } from './nativeBridgeService';

const CHANNEL_CRITICAL = 'critical_alerts';
const CHANNEL_REMINDERS = 'reminders';

const CRITICAL_IMPORTANCE: Importance = 5;
const REMINDER_IMPORTANCE: Importance = 3;
const LOCKSCREEN_VISIBILITY: Visibility = 1;

const REMINDER_OFFSETS = [
  { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
  { label: '1 hour', ms: 1 * 60 * 60 * 1000 },
  { label: '30 minutes', ms: 30 * 60 * 1000 },
  { label: 'CRITICAL (5m)', ms: 5 * 60 * 1000 },
  { label: 'NOW', ms: 0 },
] as const;

const isCriticalOffset = (label: string): boolean => label.includes('CRITICAL') || label === 'NOW';

const hashId = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.max(1, Math.abs(hash));
};

export class NotificationService {
  private channelsReady = false;

  public async setupNotificationChannels(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.channelsReady) {
      return;
    }

    await LocalNotifications.createChannel({
      id: CHANNEL_CRITICAL,
      name: 'Critical Alerts',
      description: 'For Tier 1 Alarms',
      importance: CRITICAL_IMPORTANCE,
      visibility: LOCKSCREEN_VISIBILITY,
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: CHANNEL_REMINDERS,
      name: 'Reminders',
      description: 'General reminders',
      importance: REMINDER_IMPORTANCE,
      visibility: LOCKSCREEN_VISIBILITY,
      vibration: true,
    });

    this.channelsReady = true;
  }

  public async scheduleEventReminders(event: LifeEvent): Promise<number[]> {
    if (!Capacitor.isNativePlatform() || !event.start_time) {
      return [];
    }

    await this.setupNotificationChannels();

    const now = Date.now();
    const eventTime = new Date(event.start_time).getTime();
    const notifications: LocalNotificationSchema[] = [];
    const scheduledIds: number[] = [];

    for (const offset of REMINDER_OFFSETS) {
      const triggerAt = eventTime - offset.ms;

      // Why: Android silently drops or immediately fires past alarms; skip to keep scheduling deterministic.
      if (triggerAt <= now + 1000) {
        continue;
      }

      const id = hashId(`${event.id}:${offset.label}:${triggerAt}`);
      const critical = isCriticalOffset(offset.label);

      notifications.push({
        id,
        title: offset.label === 'NOW' ? `🚨 ${event.title} STARTED!` : `Reminder: ${event.title}`,
        body: offset.label === 'NOW' ? "It's time!" : `Due in ${offset.label}.`,
        schedule: { at: new Date(triggerAt), allowWhileIdle: true },
        channelId: critical ? CHANNEL_CRITICAL : CHANNEL_REMINDERS,
        extra: {
          eventId: event.id,
          type: offset.label === 'NOW' ? 'alarm' : 'reminder',
          reason: event.title,
          offset: offset.label,
        },
        ongoing: offset.label === 'NOW',
      });

      scheduledIds.push(id);

      if (critical) {
        await nativeBridgeService.scheduleCriticalAlarm({
          triggerAtEpochMs: triggerAt,
          title: offset.label === 'NOW' ? `${event.title} started` : `Reminder: ${event.title}`,
          body: offset.label === 'NOW' ? "It's time now." : `Due in ${offset.label}.`,
          eventId: `${event.id}_${offset.label.replace(/\s+/g, '_')}`,
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }

    return scheduledIds;
  }

  public async scheduleImmediateNotification(options: {
    title: string;
    body: string;
    channelId?: string;
    extra?: Record<string, unknown>;
  }): Promise<number | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    await this.setupNotificationChannels();

    const triggerAt = Date.now() + 1000;
    const id = hashId(`${options.title}:${options.body}:${triggerAt}`);

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: options.title,
          body: options.body,
          schedule: { at: new Date(triggerAt), allowWhileIdle: true },
          channelId: options.channelId || CHANNEL_REMINDERS,
          extra: options.extra,
        },
      ],
    });

    return id;
  }
}

export const notificationService = new NotificationService();

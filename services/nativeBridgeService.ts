import { Capacitor, registerPlugin } from '@capacitor/core';

interface StartForegroundSentryResult {
  success: boolean;
}

interface ScheduleExactAlarmNotificationOptions {
  triggerAtEpochMs: number;
  title: string;
  body: string;
  eventId?: string;
  notificationId?: number;
}

interface ScheduleExactAlarmNotificationResult {
  success: boolean;
  notificationId: number;
}

interface KabalikatBridgePlugin {
  startForegroundSentry(): Promise<StartForegroundSentryResult>;
  scheduleExactAlarmNotification(
    options: ScheduleExactAlarmNotificationOptions
  ): Promise<ScheduleExactAlarmNotificationResult>;
}

const KabalikatBridge = registerPlugin<KabalikatBridgePlugin>('KabalikatBridge');

const isNativeAndroid = (): boolean => Capacitor.getPlatform() === 'android';

const safeNotificationId = (eventId: string, triggerAtEpochMs: number): number => {
  let hash = 0;
  const seed = `${eventId}:${triggerAtEpochMs}`;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return Math.max(1, Math.abs(hash));
};

export class NativeBridgeService {
  async startForegroundSentry(): Promise<boolean> {
    if (!isNativeAndroid()) {
      return false;
    }

    try {
      const result = await KabalikatBridge.startForegroundSentry();
      return result.success;
    } catch (error) {
      console.error('Failed to start foreground sentry', error);
      return false;
    }
  }

  async scheduleCriticalAlarm(options: {
    triggerAtEpochMs: number;
    title: string;
    body: string;
    eventId: string;
  }): Promise<number | null> {
    if (!isNativeAndroid()) {
      return null;
    }

    const { triggerAtEpochMs, title, body, eventId } = options;
    if (triggerAtEpochMs <= Date.now()) {
      return null;
    }

    const notificationId = safeNotificationId(eventId, triggerAtEpochMs);

    try {
      const result = await KabalikatBridge.scheduleExactAlarmNotification({
        triggerAtEpochMs,
        title,
        body,
        eventId,
        notificationId,
      });
      return result.notificationId;
    } catch (error) {
      console.error('Failed to schedule critical alarm', error);
      return null;
    }
  }
}

export const nativeBridgeService = new NativeBridgeService();

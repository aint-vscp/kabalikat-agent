package com.kabalikat.agent;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class KabalikatForegroundService extends Service {

    private static final String TAG = "KabalikatForegroundSvc";
    private static final String CHANNEL_ID = "kabalikat_sentry";
    private static final int NOTIFICATION_ID = 91001;
    private static final int RESTART_REQUEST_CODE = 91002;
    private static final long RESTART_DELAY_MS = 1500L;

    @Override
    public void onCreate() {
        super.onCreate();
        createServiceChannel();
        Log.d(TAG, "KabalikatForegroundService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildForegroundNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Why: Explicitly declaring type keeps Android 14+ foreground checks aligned with manifest.
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        scheduleServiceRestart();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        scheduleServiceRestart();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private Notification buildForegroundNotification() {
        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Kabalikat Sentry Active")
            .setContentText("Background sentry is monitoring your schedule and alerts.")
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void createServiceChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Kabalikat Sentry",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Persistent sentry foreground service state");
        channel.setShowBadge(false);

        manager.createNotificationChannel(channel);
    }

    private void scheduleServiceRestart() {
        try {
            Intent restartIntent = new Intent(this, KabalikatForegroundService.class);
            restartIntent.setPackage(getPackageName());

            PendingIntent restartPendingIntent = PendingIntent.getService(
                this,
                RESTART_REQUEST_CODE,
                restartIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                return;
            }

            long triggerAt = SystemClock.elapsedRealtime() + RESTART_DELAY_MS;

            // Why: setExactAndAllowWhileIdle gives the best chance to recover quickly after task removal.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAt,
                    restartPendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerAt,
                    restartPendingIntent
                );
            }

            Log.d(TAG, "Scheduled foreground service restart");
        } catch (Exception ex) {
            Log.e(TAG, "Failed to schedule foreground service restart", ex);
        }
    }
}

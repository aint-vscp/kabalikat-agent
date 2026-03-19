package com.kabalikat.agent;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class AlarmTriggerReceiver extends BroadcastReceiver {

    private static final String TAG = "KabalikatAlarmReceiver";
    private static final String CHANNEL_ALARM_ID = "kabalikat_alarm";
    private static final String EXTRA_NOTIFICATION_ID = "notificationId";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_BODY = "body";
    private static final String EXTRA_EVENT_ID = "eventId";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String title = intent.getStringExtra(EXTRA_TITLE);
            String body = intent.getStringExtra(EXTRA_BODY);
            String eventId = intent.getStringExtra(EXTRA_EVENT_ID);
            int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, (int) System.currentTimeMillis());

            if (title == null || title.isEmpty()) {
                title = "Kabalikat Alarm";
            }
            if (body == null || body.isEmpty()) {
                body = "Critical event alert";
            }

            createAlarmChannel(context);

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra(EXTRA_EVENT_ID, eventId);
            openIntent.putExtra("fromAlarm", true);

            PendingIntent fullScreenIntent = PendingIntent.getActivity(
                context,
                notificationId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Notification notification = new NotificationCompat.Builder(context, CHANNEL_ALARM_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fullScreenIntent, true)
                .setContentIntent(fullScreenIntent)
                .setAutoCancel(false)
                .setOngoing(true)
                .setDefaults(Notification.DEFAULT_ALL)
                .build();

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(notificationId, notification);
            }

            Intent serviceIntent = new Intent(context, KabalikatService.class);
            serviceIntent.setPackage(context.getPackageName());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            Log.d(TAG, "Alarm notification triggered: " + notificationId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to trigger alarm notification", e);
        }
    }

    private void createAlarmChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ALARM_ID,
            "Kabalikat Alarms",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Critical alarm notifications");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 500, 200, 500});
        channel.setBypassDnd(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }
}

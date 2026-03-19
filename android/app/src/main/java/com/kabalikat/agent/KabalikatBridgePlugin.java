package com.kabalikat.agent;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KabalikatBridge")
public class KabalikatBridgePlugin extends Plugin {

    private static final String TAG = "KabalikatBridgePlugin";
    private static final String EXTRA_NOTIFICATION_ID = "notificationId";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_BODY = "body";
    private static final String EXTRA_EVENT_ID = "eventId";

    @PluginMethod
    public void startForegroundSentry(PluginCall call) {
        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, KabalikatService.class);
            serviceIntent.setPackage(context.getPackageName());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground sentry", e);
            call.reject("Failed to start foreground sentry", e);
        }
    }

    @PluginMethod
    public void scheduleExactAlarmNotification(PluginCall call) {
        long triggerAt = call.getLong("triggerAtEpochMs", -1L);
        String title = call.getString("title", "Kabalikat Alarm");
        String body = call.getString("body", "Critical event alert");
        String eventId = call.getString("eventId", "");

        if (triggerAt <= System.currentTimeMillis()) {
            call.reject("triggerAtEpochMs must be in the future");
            return;
        }

        int notificationId = call.getInt("notificationId", 0);
        if (notificationId <= 0) {
            String seed = eventId + ":" + triggerAt;
            notificationId = Math.abs(seed.hashCode());
            if (notificationId == 0) {
                notificationId = (int) (System.currentTimeMillis() & 0x7fffffff);
            }
        }

        try {
            Context context = getContext();
            Intent alarmIntent = new Intent(context, AlarmTriggerReceiver.class);
            alarmIntent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
            alarmIntent.putExtra(EXTRA_TITLE, title);
            alarmIntent.putExtra(EXTRA_BODY, body);
            alarmIntent.putExtra(EXTRA_EVENT_ID, eventId);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager unavailable");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("notificationId", notificationId);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule exact alarm notification", e);
            call.reject("Failed to schedule exact alarm notification", e);
        }
    }
}

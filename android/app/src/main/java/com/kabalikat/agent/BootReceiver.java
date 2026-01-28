package com.kabalikat.agent;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "KabalikatBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);
        
        if (action == null) return;
        
        boolean shouldStart = action.equals(Intent.ACTION_BOOT_COMPLETED) ||
                             action.equals(Intent.ACTION_LOCKED_BOOT_COMPLETED) ||
                             action.equals(Intent.ACTION_MY_PACKAGE_REPLACED) ||
                             action.equals("android.intent.action.QUICKBOOT_POWERON") ||
                             action.equals("com.htc.intent.action.QUICKBOOT_POWERON") ||
                             action.equals("com.kabalikat.agent.RESTART_SERVICE");
        
        if (shouldStart) {
            Log.d(TAG, "Starting KabalikatService from BootReceiver");
            startKabalikatService(context);
        }
    }

    private void startKabalikatService(Context context) {
        try {
            Intent serviceIntent = new Intent(context, KabalikatService.class);
            serviceIntent.setPackage(context.getPackageName());
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "KabalikatService start requested");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start KabalikatService", e);
        }
    }
}

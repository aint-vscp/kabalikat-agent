package com.kabalikat.agent;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "KabalikatMain";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        startKabalikatService();
        requestBatteryOptimizationExemption();
    }
    
    @Override
    public void onResume() {
        super.onResume();
        ensureServiceRunning();
    }
    
    private void startKabalikatService() {
        try {
            Intent serviceIntent = new Intent(this, KabalikatService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "KabalikatService started from MainActivity");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start KabalikatService", e);
        }
    }
    
    private void ensureServiceRunning() {
        try {
            Intent serviceIntent = new Intent(this, KabalikatService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to ensure service running", e);
        }
    }
    
    private void requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                String packageName = getPackageName();
                
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    startActivity(intent);
                    Log.d(TAG, "Requested battery optimization exemption");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to request battery optimization exemption", e);
        }
    }
}

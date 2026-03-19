package com.kabalikat.agent;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmFullScreenActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Why: API 27+ provides first-class lockscreen/screen-on behavior for alarm-style activities.
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            // Why: Older devices need window flags to emulate the same takeover behavior.
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        setContentView(buildContent());
    }

    private View buildContent() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 72, 48, 72);
        root.setBackgroundColor(0xFF0F172A);

        TextView title = new TextView(this);
        title.setText("Kabalikat Alarm");
        title.setTextSize(28f);
        title.setTextColor(0xFFFFFFFF);
        root.addView(title);

        TextView subtitle = new TextView(this);
        String reason = getIntent().getStringExtra("reason");
        subtitle.setText(reason != null && !reason.isEmpty() ? reason : "Critical alert requires your attention.");
        subtitle.setTextSize(18f);
        subtitle.setTextColor(0xFFE2E8F0);
        subtitle.setPadding(0, 24, 0, 48);
        root.addView(subtitle);

        Button openApp = new Button(this);
        openApp.setText("Open Kabalikat");
        openApp.setOnClickListener(v -> {
            Intent intent = new Intent(AlarmFullScreenActivity.this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });
        root.addView(openApp);

        Button dismiss = new Button(this);
        dismiss.setText("Dismiss");
        dismiss.setOnClickListener(v -> finish());
        dismiss.setPadding(0, 16, 0, 0);
        root.addView(dismiss);

        return root;
    }
}

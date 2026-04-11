package com.ignitemate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.ignitemate.app.R;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CustomMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "ignitemate_channel";
    public static final String KEY_TEXT_REPLY = "key_text_reply";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data.size() > 0) {
            String title = data.get("title");
            String body = data.get("body");
            String actionId = data.get("actionId");

            if ("inline_reply".equals(actionId)) {
                showNotificationWithReply(title, body);
            }
        }
    }

    private void showNotificationWithReply(String title, String body) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "IgniteMate Messages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Agent messages and notifications");
            channel.enableLights(true);
            channel.setLightColor(Color.MAGENTA);
            notificationManager.createNotificationChannel(channel);
        }

        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
                .setLabel("Type a message...")
                .build();

        Intent replyIntent = new Intent(this, ReplyReceiver.class);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }

        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
                this,
                (int) System.currentTimeMillis(), // Unique ID
                replyIntent,
                flags
        );

        NotificationCompat.Action action = new NotificationCompat.Action.Builder(
                R.mipmap.ic_launcher_round, 
                "Reply",
                replyPendingIntent
        ).addRemoteInput(remoteInput).build();

        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent mainPendingIntent = PendingIntent.getActivity(
                this, 0, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher_round) 
                .setContentTitle(title != null ? title : "IgniteMate")
                .setContentText(body != null ? body : "")
                .setAutoCancel(true)
                .setContentIntent(mainPendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(action);

        notificationManager.notify(1001, builder.build());
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }
}

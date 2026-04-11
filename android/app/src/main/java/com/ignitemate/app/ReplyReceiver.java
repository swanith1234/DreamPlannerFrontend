package com.ignitemate.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.ignitemate.app.R;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class ReplyReceiver extends BroadcastReceiver {
    private static final String TAG = "IgniteMateReply";
    private static final String BACKEND_URL = "https://dreamplanner-lbm7.onrender.com";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        if (remoteInput != null) {
            String replyText = remoteInput.getCharSequence(CustomMessagingService.KEY_TEXT_REPLY).toString();
            Log.d(TAG, "Reply received: " + replyText);

            // Fetch HTTPOnly cookies stored by Capacitor's WebView
            String cookies = CookieManager.getInstance().getCookie(BACKEND_URL);
            String accessToken = null;
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
                    if (part.trim().startsWith("accessToken=")) {
                        accessToken = part.trim().substring("accessToken=".length());
                        break;
                    }
                }
            }

            // Immediately update notification to show "Sending..."
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationCompat.Builder repliedNotification = new NotificationCompat.Builder(context, "ignitemate_channel")
                    .setSmallIcon(R.mipmap.ic_launcher_round)
                    .setContentTitle("Sending reply...")
                    .setAutoCancel(true);
            notificationManager.notify(1001, repliedNotification.build());

            String finalAccessToken = accessToken;
            ExecutorService executor = Executors.newSingleThreadExecutor();
            executor.execute(() -> {
                try {
                    URL url = new URL(BACKEND_URL + "/api/chat");
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("Content-Type", "application/json");
                    
                    if (finalAccessToken != null) {
                        connection.setRequestProperty("Cookie", "accessToken=" + finalAccessToken);
                    } else {
                        Log.w(TAG, "Access Token cookie is purely missing. Request might get 401ed.");
                    }
                    
                    connection.setDoOutput(true);
                    JSONObject jsonParam = new JSONObject();
                    jsonParam.put("message", replyText);

                    try (OutputStream os = connection.getOutputStream()) {
                        byte[] input = jsonParam.toString().getBytes("utf-8");
                        os.write(input, 0, input.length);
                    }

                    int code = connection.getResponseCode();
                    Log.d(TAG, "Backend Response Code: " + code);
                    
                    if (code == 200 || code == 201) {
                         // Parse success response optionally
                         InputStream is = connection.getInputStream();
                         Scanner scanner = new Scanner(is);
                         StringBuilder response = new StringBuilder();
                         while(scanner.hasNext()) response.append(scanner.nextLine());
                         scanner.close();
                         
                         // Clear the "Sending" notification, job done!
                         notificationManager.cancel(1001);
                    } else {
                        // Error
                        NotificationCompat.Builder errNotify = new NotificationCompat.Builder(context, "ignitemate_channel")
                            .setSmallIcon(R.mipmap.ic_launcher_round)
                            .setContentTitle("Failed to send message")
                            .setTimeoutAfter(3000)
                            .setAutoCancel(true);
                        notificationManager.notify(1001, errNotify.build());
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Network failed in reply receiver", e);
                    notificationManager.cancel(1001);
                }
            });
        }
    }
}

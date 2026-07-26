package com.ignitemate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Subclasses Capacitor's own FirebaseMessagingService so token registration
 * (onNewToken) keeps working exactly as before. We only override
 * onMessageReceived, and only to special-case "interactive" pushes — plain
 * reminders fall straight through to super() and get Capacitor's normal
 * default handling (which is what already correctly opens/routes the app on
 * tap, see PushNotificationsPlugin#handleOnNewIntent).
 *
 * The backend (push.service.ts) sends interactive pushes as DATA-ONLY messages
 * (no top-level "notification" block) specifically so onMessageReceived always
 * fires here, in the background, and we can build real OS action buttons +
 * an inline-reply (RemoteInput) — something Capacitor's plugin does not support
 * on Android (registerActionTypes() is iOS-only).
 *
 * IMPORTANT: this class must be wired up in AndroidManifest.xml *instead of*
 * com.capacitorjs.plugins.pushnotifications.MessagingService (see the
 * tools:node="remove" + new <service> block described alongside this file) —
 * Android does not reliably support two FirebaseMessagingService
 * implementations in one app.
 */
public class MyFcmMessagingService extends MessagingService {

    private static final String CHANNEL_ID = "task_progress_actions";
    private static final String KEY_REPLY_TEXT = "key_reply_text";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();

        if ("task_progress".equals(data.get("interactive"))) {
            showInteractiveNotification(remoteMessage);
        } else {
            // Not an actionable push — defer to Capacitor's default handling
            // (forwards to JS + shows a plain notification when backgrounded).
            super.onMessageReceived(remoteMessage);
        }
    }

    private void showInteractiveNotification(RemoteMessage remoteMessage) {
        Context context = getApplicationContext();
        Map<String, String> data = remoteMessage.getData();

        String title = data.get("title");
        String body = data.get("body");
        String apiUrl = data.get("apiUrl");
        String apiPath = data.get("apiPath");
        String notificationId = data.get("notificationId");
        int notifId = notificationId != null ? notificationId.hashCode() : (int) System.currentTimeMillis();

        ensureChannel(context);

        // Tap-the-body PendingIntent: reuse RemoteMessage.toIntent(), which stamps
        // the "google.message_id" extra that PushNotificationsPlugin.handleOnNewIntent
        // looks for — this makes a plain tap fire the EXACT SAME
        // 'pushNotificationActionPerformed' (actionId: 'tap') JS event as a normal
        // Capacitor-built notification, with the same `data.url` deep link, with
        // zero custom bridge/JS-injection code required on our part.
        Intent openIntent = remoteMessage.toIntent();
        openIntent.setClass(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPI = PendingIntent.getActivity(
            context,
            notifId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            // TODO: swap for a proper flat/monochrome status-bar icon before shipping —
            // ic_launcher is used here only because it is guaranteed to exist.
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentPI);

        for (NotificationCompat.Action action : buildActions(remoteMessage, context, notifId, apiUrl, apiPath, notificationId)) {
            builder.addAction(action);
        }

        NotificationManagerCompat.from(context).notify(notifId, builder.build());
    }

    /**
     * Builds one NotificationCompat.Action per entry in the `actions` JSON array the
     * backend attached to the push (see NotificationDispatcher#buildTaskPushActions —
     * kept as the single source of truth for labels/order across web + Android).
     * A `type: "text"` entry becomes a RemoteInput action instead of a plain button.
     */
    private java.util.List<NotificationCompat.Action> buildActions(
        RemoteMessage remoteMessage,
        Context context,
        int notifId,
        String apiUrl,
        String apiPath,
        String notificationId
    ) {
        java.util.List<NotificationCompat.Action> actions = new java.util.ArrayList<>();
        String rawActions = remoteMessage.getData().get("actions");
        if (rawActions == null) return actions;

        try {
            JSONArray arr = new JSONArray(rawActions);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.getJSONObject(i);
                String actionKey = a.optString("action");
                String title = a.optString("title", actionKey);
                boolean isText = "text".equals(a.optString("type"));

                if (isText) {
                    actions.add(buildReplyAction(context, notifId, apiUrl, apiPath, notificationId, title, a.optString("placeholder", "Type a message…")));
                } else {
                    int delta = deltaForAction(actionKey);
                    actions.add(buildDeltaAction(context, notifId, actionKey, title, delta, apiUrl, apiPath, notificationId));
                }
            }
        } catch (JSONException e) {
            // Malformed actions payload — show the notification with no buttons
            // rather than crash the whole message handler.
        }

        return actions;
    }

    private int deltaForAction(String actionKey) {
        if ("add_25".equals(actionKey)) return 25;
        if ("add_50".equals(actionKey)) return 50;
        if ("mark_done".equals(actionKey)) return 100;
        return 0;
    }

    private NotificationCompat.Action buildDeltaAction(
        Context context,
        int notifId,
        String actionKey,
        String title,
        int delta,
        String apiUrl,
        String apiPath,
        String notificationId
    ) {
        Intent intent = new Intent(context, TaskActionReceiver.class);
        intent.setAction(TaskActionReceiver.ACTION_DELTA);
        intent.putExtra(TaskActionReceiver.EXTRA_DELTA, delta);
        intent.putExtra(TaskActionReceiver.EXTRA_API_URL, apiUrl);
        intent.putExtra(TaskActionReceiver.EXTRA_API_PATH, apiPath);
        intent.putExtra(TaskActionReceiver.EXTRA_NOTIF_ID, notifId);

        int requestCode = (notificationId + ":" + actionKey).hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Action.Builder(0, title, pi).build();
    }

    private NotificationCompat.Action buildReplyAction(
        Context context,
        int notifId,
        String apiUrl,
        String apiPath,
        String notificationId,
        String title,
        String placeholder
    ) {
        RemoteInput remoteInput = new RemoteInput.Builder(KEY_REPLY_TEXT).setLabel(placeholder).build();

        Intent intent = new Intent(context, TaskActionReceiver.class);
        intent.setAction(TaskActionReceiver.ACTION_REPLY);
        intent.putExtra(TaskActionReceiver.EXTRA_API_URL, apiUrl);
        intent.putExtra(TaskActionReceiver.EXTRA_API_PATH, apiPath);
        intent.putExtra(TaskActionReceiver.EXTRA_NOTIF_ID, notifId);

        int requestCode = (notificationId + ":reply").hashCode();
        // RemoteInput results are merged into this Intent by the system at delivery
        // time, which requires a MUTABLE PendingIntent (Android 12+ silently drops
        // the reply text if this is FLAG_IMMUTABLE — easy to get wrong).
        PendingIntent pi = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        return new NotificationCompat.Action.Builder(0, title, pi)
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(true)
            .build();
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Task progress actions",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Reminders you can act on directly — log progress or mark a task done.");
                manager.createNotificationChannel(channel);
            }
        }
    }

    static String replyKey() {
        return KEY_REPLY_TEXT;
    }
}

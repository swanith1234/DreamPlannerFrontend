package com.ignitemate.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

/**
 * Handles taps on the interactive task-progress notification's action buttons and
 * inline reply — entirely in the background. This is a plain BroadcastReceiver (not
 * an Activity), so handling an action never opens or focuses the app; the user stays
 * exactly where they were, exactly like WhatsApp's "Mark as read"/"Reply" actions.
 *
 * Auth: the app's session lives in httpOnly cookies inside the WebView's cookie jar
 * (see capacitor.config.ts's CapacitorCookies plugin). We read those cookies via
 * android.webkit.CookieManager and attach them as a `Cookie` header — the same
 * "credentials included" semantics the web service worker gets for free from the
 * browser. If the 15-minute access token has expired we call /api/auth/refresh first
 * and retry once, mirroring the frontend axios interceptor's 401 handling.
 *
 * Caveat: CookieManager.getInstance() requires the WebView engine to have been
 * initialized at least once in this process. In practice that's true for any device
 * that has opened the app and logged in, but if you see cookies come back empty on a
 * cold background receive on some OEM/WebView-provider combination, the fallback is
 * to also persist the access/refresh tokens to SharedPreferences from the JS side and
 * read those here instead — test this path on a real device before shipping.
 */
public class TaskActionReceiver extends BroadcastReceiver {

    private static final String TAG = "TaskActionReceiver";

    public static final String ACTION_DELTA = "com.ignitemate.app.action.TASK_DELTA";
    public static final String ACTION_REPLY = "com.ignitemate.app.action.TASK_REPLY";

    public static final String EXTRA_DELTA = "extra_delta";
    public static final String EXTRA_API_URL = "extra_api_url";
    public static final String EXTRA_API_PATH = "extra_api_path";
    public static final String EXTRA_NOTIF_ID = "extra_notif_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        String apiUrl = intent.getStringExtra(EXTRA_API_URL);
        String apiPath = intent.getStringExtra(EXTRA_API_PATH);
        int notifId = intent.getIntExtra(EXTRA_NOTIF_ID, 0);

        if (apiUrl == null || apiPath == null) {
            Log.w(TAG, "Missing apiUrl/apiPath on notification action intent");
            return;
        }

        final String jsonBody = buildBody(intent);
        final Context appContext = context.getApplicationContext();

        // BroadcastReceivers normally must finish onReceive() near-instantly and
        // cannot do network I/O on the main thread; goAsync() + a background thread
        // buys the ~10s we need for a couple of quick HTTP round-trips.
        final PendingResult pendingResult = goAsync();

        new Thread(() -> {
            try {
                boolean ok = postWithRefreshRetry(appContext, apiUrl, apiPath, jsonBody);
                Log.i(TAG, "Notification action posted, success=" + ok);
            } catch (Exception e) {
                Log.e(TAG, "Failed to post notification action", e);
            } finally {
                // Collapse the notification either way — from the user's perspective
                // the action was "handled"; server-side failures are logged, not
                // surfaced as a stuck/broken-looking notification.
                NotificationManagerCompat.from(appContext).cancel(notifId);
                pendingResult.finish();
            }
        }).start();
    }

    private String buildBody(Intent intent) {
        if (ACTION_REPLY.equals(intent.getAction())) {
            Bundle remoteInputResults = RemoteInput.getResultsFromIntent(intent);
            CharSequence replyText = remoteInputResults != null ? remoteInputResults.getCharSequence(MyFcmMessagingService.replyKey()) : null;
            return "{\"text\":" + JSONObject.quote(replyText == null ? "" : replyText.toString()) + "}";
        }
        int delta = intent.getIntExtra(EXTRA_DELTA, 0);
        return "{\"delta\":" + delta + "}";
    }

    private boolean postWithRefreshRetry(Context context, String apiUrl, String apiPath, String jsonBody) throws IOException {
        int status = post(context, apiUrl + apiPath, jsonBody);

        if (status == 401) {
            refreshSession(context, apiUrl);
            status = post(context, apiUrl + apiPath, jsonBody);
        }

        return status >= 200 && status < 300;
    }

    private int post(Context context, String urlString, String jsonBody) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(urlString).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(10_000);
            conn.setRequestProperty("Content-Type", "application/json");

            String cookie = android.webkit.CookieManager.getInstance().getCookie(urlString);
            if (cookie != null) conn.setRequestProperty("Cookie", cookie);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            }

            return conn.getResponseCode();
        } finally {
            conn.disconnect();
        }
    }

    private void refreshSession(Context context, String apiUrl) {
        String refreshUrl = apiUrl + "/api/auth/refresh";
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(refreshUrl).openConnection();
            try {
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setFixedLengthStreamingMode(0);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                String cookie = android.webkit.CookieManager.getInstance().getCookie(apiUrl);
                if (cookie != null) conn.setRequestProperty("Cookie", cookie);

                conn.getOutputStream().close();
                int status = conn.getResponseCode();

                if (status == 200) {
                    Map<String, List<String>> headers = conn.getHeaderFields();
                    List<String> setCookies = headers.get("Set-Cookie");
                    if (setCookies == null) setCookies = headers.get("set-cookie");
                    if (setCookies != null) {
                        android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                        for (String sc : setCookies) {
                            // Refresh/access cookies are set for the API host itself.
                            cookieManager.setCookie(apiUrl, sc);
                        }
                        cookieManager.flush();
                    }
                }
            } finally {
                conn.disconnect();
            }
        } catch (IOException e) {
            Log.e(TAG, "Session refresh failed", e);
        }
    }
}

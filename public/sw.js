// Service Worker for Push Notifications
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
            .then(() => console.log('Service Worker Activated'))
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/pwa-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            actions: data.pushActions || data.actions || [],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.data?.url || '/app/home',
                apiUrl: data.data?.apiUrl,
                apiPath: data.data?.apiPath
            }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// POSTs to the notification-action endpoint with cookie auth, retrying once after
// a silent /auth/refresh if the 15-minute access-token cookie has already expired
// (very likely for anything but the most immediate notification interactions).
async function postNotificationAction(apiUrl, apiPath, body) {
    const doPost = () =>
        fetch(`${apiUrl}${apiPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // sends the httpOnly accessToken/refreshToken cookies
            body: JSON.stringify(body)
        });

    let response = await doPost();

    if (response.status === 401) {
        const refreshed = await fetch(`${apiUrl}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        if (refreshed.ok) {
            response = await doPost();
        }
    }

    return response;
}

self.addEventListener('notificationclick', function (event) {
    console.log('On notification click: ', event.notification.tag, event.action);

    // If an action button (or the inline text-reply box) was used, handle it
    // silently without opening the app window.
    if (event.action) {
        const { apiUrl, apiPath } = event.notification.data;

        if (!apiPath) {
            event.notification.close();
            return;
        }

        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        let body = null;
        if (event.action === 'add_25') body = { delta: 25, localDate };
        else if (event.action === 'add_50') body = { delta: 50, localDate };
        else if (event.action === 'mark_done') body = { delta: 100, localDate };
        else if (event.action === 'reply') body = { text: event.reply || '', localDate };

        if (body) {
            event.waitUntil(
                postNotificationAction(apiUrl, apiPath, body)
                    .then(response => {
                        console.log(`Notification action '${event.action}' → ${response.status}`);
                        event.notification.close();
                    })
                    .catch(error => {
                        console.error('Failed to post notification action', error);
                        event.notification.close();
                    })
            );
            return;
        }
    }

    event.notification.close();

    // This looks to see if the current is already open and
    // focuses if it is
    event.waitUntil(
        clients.matchAll({
            type: "window"
        })
            .then(function (clientList) {
                const urlToOpen = event.notification.data.url || '/app/home';

                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url === urlToOpen && 'focus' in client)
                        return client.focus();
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

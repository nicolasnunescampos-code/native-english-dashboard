import { supabase } from '@/lib/supabase';

export interface DeviceNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  vibrate?: number[];
}

export const checkNotificationSupport = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!checkNotificationSupport()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!checkNotificationSupport()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
};

/**
 * Triggers a native system notification on the device.
 * Prioritizes ServiceWorker showNotification (essential for PWAs on mobile / iOS / Android),
 * falling back to window Notification constructor.
 */
export const triggerDeviceNotification = async ({
  title,
  body,
  icon = '/pwa-192x192.png',
  badge = '/pwa-192x192.png',
  tag = 'native-english',
  url = '/student',
  vibrate = [150, 80, 150],
}: DeviceNotificationOptions) => {
  if (!checkNotificationSupport() || Notification.permission !== 'granted') {
    return;
  }

  // Trigger hardware vibration if device supports it (Android / Chrome mobile)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibrate);
    } catch {
      // Ignored if vibration not permitted
    }
  }

  // Try ServiceWorker registration first (required for standalone PWA on iOS 16.4+ and Android)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          renotify: true,
          vibrate,
          data: { url },
        });
        return;
      }
    } catch (e) {
      console.warn('ServiceWorker showNotification failed, attempting fallback:', e);
    }
  }

  // Fallback to standard Notification
  try {
    const notif = new Notification(title, {
      body,
      icon,
      tag,
      requireInteraction: true,
    });
    notif.onclick = () => {
      window.focus();
      if (url && typeof window !== 'undefined') {
        window.location.href = url.startsWith('/') ? `/login${url}` : url;
      }
      notif.close();
    };
  } catch (err) {
    console.warn('Standard Notification fallback failed:', err);
  }
};

/**
 * Syncs the browser's PushSubscription to Supabase for server-side push notifications
 */
export const syncPushSubscription = async (userId: string, vapidPublicKey?: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return;

    let sub = await reg.pushManager.getSubscription();

    // If a VAPID public key is provided and no subscription exists, subscribe
    if (!sub && vapidPublicKey) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (sub) {
      const subJson = sub.toJSON();
      if (subJson.endpoint && subJson.keys) {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: 'endpoint' }
        );
      }
    }
  } catch (err) {
    // If table doesn't exist yet or push not configured, silently log warning
    console.warn('Could not sync push subscription:', err);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

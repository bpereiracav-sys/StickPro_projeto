import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import api from '../services/api';

export function NotificationPermission() {
  const [permission, setPermission] = useState('default');
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setSubscribing(true);
    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Permissão para notificações negada');
        return;
      }

      // Get VAPID public key from server
      const vapidResponse = await api.get('/notifications/vapid-public-key');
      const vapidPublicKey = vapidResponse.data.publicKey;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      await api.post('/notifications/subscribe', subscription.toJSON());

      setIsSubscribed(true);
      toast.success('Notificações ativadas! Vais receber alertas de convocatórias.');
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      await api.delete('/notifications/unsubscribe');
      
      setIsSubscribed(false);
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
    } finally {
      setSubscribing(false);
    }
  };

  // Don't show if notifications not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="w-4 h-4" />
        <span>Notificações bloqueadas no browser</span>
      </div>
    );
  }

  return (
    <Button
      variant={isSubscribed ? 'secondary' : 'default'}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={subscribing}
      className="gap-2"
      data-testid="notification-toggle"
    >
      {subscribing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          A processar...
        </>
      ) : isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          Desativar Notificações
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Ativar Notificações
        </>
      )}
    </Button>
  );
}

export default NotificationPermission;

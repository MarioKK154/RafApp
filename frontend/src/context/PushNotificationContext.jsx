import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from './AuthContext';

const PushNotificationContext = createContext();

export function usePushNotifications() {
    return useContext(PushNotificationContext);
}

// Ensure this matches VAPID_PUBLIC_KEY from backend
const PUBLIC_VAPID_KEY = 'BG-K9t1u9m6M1M_x0l_I2N9o7N0x_m9n8T_Q1l3p_S0v0N0r4l0q0M0w0P_K8N3o_';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function PushNotificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;

        const registerServiceWorkerAndSubscribe = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.register('/service-worker.js');
                    
                    // Wait for service worker to be ready
                    const readyRegistration = await navigator.serviceWorker.ready;

                    const existingSubscription = await readyRegistration.pushManager.getSubscription();
                    if (existingSubscription) {
                        setIsSubscribed(true);
                        // Make sure backend is updated
                        await sendSubscriptionToBackend(existingSubscription);
                        return;
                    }

                    // Request notification permission if not already granted
                    if (Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') return;
                    } else if (Notification.permission === 'denied') {
                        return;
                    }

                    const subscription = await readyRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
                    });

                    await sendSubscriptionToBackend(subscription);
                    setIsSubscribed(true);
                } catch (error) {
                    console.error('Error during service worker registration or subscription:', error);
                }
            }
        };

        registerServiceWorkerAndSubscribe();
    }, [isAuthenticated]);

    const sendSubscriptionToBackend = async (subscription) => {
        try {
            const parsed = JSON.parse(JSON.stringify(subscription));
            await axiosInstance.post('/notifications/subscribe', {
                endpoint: parsed.endpoint,
                p256dh: parsed.keys.p256dh,
                auth: parsed.keys.auth
            });
        } catch (error) {
            console.error('Failed to send push subscription to backend:', error);
        }
    };

    return (
        <PushNotificationContext.Provider value={{ isSubscribed }}>
            {children}
        </PushNotificationContext.Provider>
    );
}

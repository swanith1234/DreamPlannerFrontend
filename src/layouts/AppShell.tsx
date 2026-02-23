import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiHome5Line,
    RiHome5Fill,
    RiDashboardLine,
    RiDashboardFill,
    RiMoonClearLine,
    RiMoonClearFill,
    RiCheckboxCircleLine,
    RiCheckboxCircleFill,
    RiSettings4Line,
    RiSettings4Fill,
    RiLogoutBoxLine
} from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import styles from './AppShell.module.css';

const AppShell: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [showNotifBanner, setShowNotifBanner] = useState(false);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            setShowNotifBanner(true);
        }
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    const enableNotifications = async () => {
        if (!('Notification' in window)) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            setShowNotifBanner(false);

            // Register Service Worker
            if ('serviceWorker' in navigator) {
                const register = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                // Get VAPID Key
                // Ideally use an API call to get it, or env if exposed
                // For now, we fetch it from backend or env. 
                // Using env var VITE_VAPID_PUBLIC_KEY would be best, but we created an endpoint /api/notifications/vapid-key
                // Let's use the endpoint or hardcode for now if env not possible to sync easily dynamics.
                // We'll try to fetch it.

                // Note: You need to expose VAPID public key to frontend via API or ENV.
                // We added /api/notifications/vapid-key in backend.

                // Fetch VAPID key
                // Using api client
                const { data: { publicKey } } = await import('../api/client').then(m => m.default.get('/notifications/vapid-key'));

                const subscription = await register.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                });

                // Send subscription to backend
                await import('../api/client').then(m => m.default.post('/notifications/subscribe', subscription));
                console.log("Push Notification Subscribed!");
            }

        } catch (error) {
            console.error("Error requesting notification permission or subscribing", error);
        }
    };

    const navItems = [
        { path: '/app/home', icon: RiHome5Line, activeIcon: RiHome5Fill, label: 'Home' },
        { path: '/app/dashboard', icon: RiDashboardLine, activeIcon: RiDashboardFill, label: 'Dashboard' },
        { path: '/app/dreams', icon: RiMoonClearLine, activeIcon: RiMoonClearFill, label: 'Dreams' },
        { path: '/app/tasks', icon: RiCheckboxCircleLine, activeIcon: RiCheckboxCircleFill, label: 'Tasks' },
        { path: '/app/settings', icon: RiSettings4Line, activeIcon: RiSettings4Fill, label: 'Settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={styles.container}>
            {/* Notification Permission Banner */}
            <AnimatePresence>
                {showNotifBanner && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={styles.notificationBanner}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            background: 'var(--color-primary)',
                            color: 'white',
                            textAlign: 'center',
                            padding: '8px',
                            fontSize: '0.9rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        <span>Enable notifications to get real-time updates on your dreams and tasks!</span>
                        <button
                            onClick={enableNotifications}
                            style={{
                                background: 'white',
                                color: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 12px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Enable
                        </button>
                        <button
                            onClick={() => setShowNotifBanner(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.8)',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            &times;
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar for Desktop / Hidden on Mobile */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>DP</div>
                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = isActive ? item.activeIcon : item.icon;

                        return (
                            <button
                                key={item.path}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                <Icon className={styles.icon} />
                                <span className={styles.label}>{item.label}</span>
                                {isActive && <motion.div layoutId="sidebar-active" className={styles.activeIndicator} />}
                            </button>
                        );
                    })}
                </nav>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <RiLogoutBoxLine />
                </button>
            </aside>

            {/* Main Content Area */}
            <main className={styles.main} style={{ paddingTop: showNotifBanner ? '40px' : '0', transition: 'padding-top 0.3s' }}>
                <Outlet />
            </main>

            {/* Bottom Nav for Mobile / Hidden on Desktop */}
            <nav className={styles.bottomNav}>
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <button
                            key={item.path}
                            className={`${styles.mobileNavItem} ${isActive ? styles.active : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <Icon className={styles.icon} />
                            {isActive && <motion.div layoutId="bottom-nav-active" className={styles.activeDot} />}
                        </button>
                    );
                })}
                {/* Mobile Logout Button */}
                <button
                    className={`${styles.mobileNavItem} ${styles.mobileLogoutBtn}`}
                    onClick={handleLogout}
                    style={{ color: 'var(--color-danger)' }}
                >
                    <RiLogoutBoxLine className={styles.icon} />
                </button>
            </nav>
        </div>
    );
};

export default AppShell;

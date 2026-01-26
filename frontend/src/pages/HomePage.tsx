import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import PageTransition from '../components/PageTransition';
import ThreeDLoader from '../components/ThreeDLoader';
import { RiRefreshLine } from 'react-icons/ri';

interface Notification {
    id: string;
    message: string;
    type: string;
    timestamp: string;
    metadata?: {
        actions?: Array<{ label: string; action: string; value?: any }>;
    };
}

const HomePage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications(1);
    }, []);

    const fetchNotifications = async (pageNum: number) => {
        if (loading) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/notifications?page=${pageNum}&limit=20`);
            const newNotifs = data.notifications || [];
            if (newNotifs.length < 20) setHasMore(false);

            // Backend returns newest first. 
            // For chat, we want oldest at top, newest at bottom.
            // But pagination returns page 1 (newest 20), page 2 (older 20).
            // So we need to reverse the chunk, but PREPEND if loading older pages?

            // Wait, standard chat:
            // Load Page 1 (Newest 20) -> Reverse -> Show at bottom.
            // Load Page 2 (Next 20) -> Reverse -> Prepend to current list.

            const reversedChunk = [...newNotifs].reverse();

            if (pageNum === 1) {
                setNotifications(reversedChunk);
                // Scroll to bottom only on first load
                setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
            } else {
                setNotifications(prev => [...reversedChunk, ...prev]);
            }
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (hasMore && !loading) {
            fetchNotifications(page + 1);
        }
    };

    const handleAction = async (action: string, value?: any) => {
        // Optimistic UI: Add user response bubble
        const userMsg: Notification = {
            id: Date.now().toString(),
            message: getActionLabel(action, value),
            type: 'USER_ACTION',
            timestamp: new Date().toISOString()
        };
        setNotifications(prev => [...prev, userMsg]);

        try {
            // In a real app, you'd send this to backend. 
            // For Phase 1, we might just refresh notifications or trigger a specific endpoint depending on action.
            // Example: completing a task
            console.log(`Action: ${action}, Value: ${value}`);

            // Simulate backend response after delay
            setTimeout(() => {
                fetchNotifications(1);
            }, 1000);

        } catch (error) {
            console.error("Action failed", error);
        }
    };

    const getActionLabel = (action: string, value: any) => {
        // Helper to format user's "response" text
        if (value) return `${action}: ${value}%`;
        return action;
    }

    const formatDateHeader = (isoString: string) => {
        if (!isoString) return 'Unknown Date';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    let lastDateHeader = '';

    return (
        <PageTransition>
            <div style={{ maxWidth: '800px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Header / Load More */}
                <div style={{ textAlign: 'center', padding: '10px' }}>
                    {loading && <div style={{ height: '40px' }}><ThreeDLoader /></div>}
                    {!loading && hasMore && (
                        <button
                            onClick={loadMore}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '0 auto' }}
                        >
                            <RiRefreshLine /> Load Previous
                        </button>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AnimatePresence>
                        {notifications.map((notif, index) => {
                            // Check if date header is needed
                            // Note: notif uses 'timestamp' or 'scheduledAt' from backend?
                            // Backend controller returns objects with 'scheduledAt'. 
                            // If frontend interface expects 'timestamp', we should map it or use scheduledAt.
                            // Let's check the API response or just use 'scheduledAt' if present, falling back to timestamp.
                            const dateStr = (notif as any).scheduledAt || notif.timestamp;
                            const header = formatDateHeader(dateStr);
                            const showHeader = header !== lastDateHeader;
                            if (showHeader) lastDateHeader = header;
                            // **Issue**: Map iteration order and variable mutation. 
                            // React renders might re-run this. Better to pre-process or just check previous item.
                            const prevNotif = notifications[index - 1];
                            const prevDateStr = prevNotif ? ((prevNotif as any).scheduledAt || prevNotif.timestamp) : null;
                            const currentHeader = formatDateHeader(dateStr);
                            const prevHeader = prevDateStr ? formatDateHeader(prevDateStr) : '';
                            const shouldShowHeader = index === 0 || currentHeader !== prevHeader;

                            return (
                                <React.Fragment key={notif.id}>
                                    {shouldShowHeader && (
                                        <div style={{ textAlign: 'center', margin: '16px 0', opacity: 0.6 }}>
                                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                {currentHeader}
                                            </span>
                                        </div>
                                    )}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        style={{
                                            alignSelf: notif.type === 'USER_ACTION' ? 'flex-end' : 'flex-start',
                                            maxWidth: '80%'
                                        }}
                                    >
                                        <GlassCard
                                            variant={notif.type === 'USER_ACTION' ? 'chat' : 'default'}
                                            style={{
                                                borderBottomRightRadius: notif.type === 'USER_ACTION' ? '4px' : '16px',
                                                borderBottomLeftRadius: notif.type === 'USER_ACTION' ? '16px' : '4px',
                                                backgroundColor: notif.type === 'USER_ACTION' ? 'rgba(0, 242, 234, 0.1)' : 'var(--glass-bg)',
                                                borderColor: notif.type === 'USER_ACTION' ? 'rgba(0, 242, 234, 0.3)' : 'var(--glass-border)',
                                                padding: '12px 16px'
                                            }}
                                        >
                                            <p style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>{notif.message}</p>

                                            {notif.metadata?.actions && (
                                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {notif.metadata.actions.map((action, idx) => (
                                                        <GlowButton
                                                            key={idx}
                                                            variant="secondary"
                                                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                                            onClick={() => handleAction(action.action, action.value)}
                                                        >
                                                            {action.label}
                                                        </GlowButton>
                                                    ))}
                                                </div>
                                            )}
                                        </GlassCard>
                                        <span style={{
                                            display: 'block',
                                            fontSize: '0.7rem',
                                            color: 'rgba(255,255,255,0.4)',
                                            marginTop: '4px',
                                            textAlign: notif.type === 'USER_ACTION' ? 'right' : 'left'
                                        }}>
                                            {new Date((notif as any).scheduledAt || notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </motion.div>
                                </React.Fragment>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                </div>
            </div>
        </PageTransition>
    );
};

export default HomePage;

import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics';
import type { WeeklyInsightResponse } from '../api/analytics';
import SimpleGauge from '../components/Analytics/SimpleGauge';
import WeeklyInsight from '../components/Analytics/WeeklyInsight';
import { motion } from 'framer-motion';

const DashboardPage: React.FC = () => {
    const [data, setData] = useState<WeeklyInsightResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await analyticsApi.getWeeklyDashboard();
                setData(res);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div style={{ padding: 40, color: 'white' }}>Loading Analytics...</div>;

    const snapshot = data?.snapshot;
    const insight = data?.insight;

    if (!snapshot) {
        return (
            <div style={{ padding: 40, color: 'white' }}>
                <h2>No Analytics Available</h2>
                <p>Complete some tasks to see your insights!</p>
                <button onClick={() => analyticsApi.triggerGeneration().then(() => window.location.reload())}>
                    Generate Now (Dev)
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1>Weekly Dashboard</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Week of {new Date(snapshot.weekStart).toLocaleDateString()}
                </p>
            </header>

            {/* AI Narrative */}
            <WeeklyInsight
                insightType={insight?.insightType || 'WEEKLY_VERDICT'}
                narrative={insight?.evidence?.narrative || (insight as any)?.message}
            />

            {/* Scores Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <ScoreCard>
                    <SimpleGauge value={snapshot.disciplineScore} label="Discipline" size={140} />
                </ScoreCard>

                <ScoreCard>
                    <SimpleGauge value={snapshot.consistencyScore} label="Consistency" color="var(--color-gold)" size={140} />
                </ScoreCard>

                <ScoreCard>
                    <SimpleGauge value={snapshot.executionRate || 0} label="Execution" color="var(--color-success)" size={140} />
                </ScoreCard>
            </div>

            {/* Detailed Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <StatBox title="Active Days" value={`${snapshot.activeDays}/7`} />
                <StatBox title="Planned vs Completed" value={`${snapshot.totalCheckpointsCompleted} / ${snapshot.totalCheckpointsPlanned}`} />
                <StatBox title="Late Checkpoints" value={snapshot.lateCheckpoints} color="var(--color-danger)" />
                <StatBox title="Early Starts" value={snapshot.earlyStarts} color="var(--color-accent)" />
            </div>

            {/* Dev Trigger */}
            <div style={{ marginTop: 40, opacity: 0.5 }}>
                <button onClick={() => analyticsApi.triggerGeneration().then(() => window.location.reload())}>
                    Refresh Analytics
                </button>
            </div>
        </div>
    );
};

const ScoreCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <motion.div
        whileHover={{ y: -5 }}
        style={{
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid var(--glass-border)'
        }}
    >
        {children}
    </motion.div>
);

const StatBox: React.FC<{ title: string; value: string | number; color?: string }> = ({ title, value, color }) => (
    <div style={{
        background: 'var(--color-bg-secondary)',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid var(--glass-border)'
    }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{title}</span>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: color || 'white' }}>{value}</span>
    </div>
);

export default DashboardPage;

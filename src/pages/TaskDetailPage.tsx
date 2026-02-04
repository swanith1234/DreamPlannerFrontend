
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiArrowLeftLine, RiTimeLine, RiCheckboxCircleLine,
    RiEditLine, RiDeleteBinLine,
    RiCheckDoubleLine
} from 'react-icons/ri';
import api from '../api/client';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import PageTransition from '../components/PageTransition';
import PageLoader from '../components/PageLoader';

interface TaskCheckpoint {
    id: string;
    title: string;
    targetDate: string;
    isCompleted: boolean;
    progress: number;
    orderIndex: number;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    deadline: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'ARCHIVED';
    progressPercent: number;
    checkpoints: TaskCheckpoint[];
    dream?: {
        id: string;
        title: string;
    };
}

const TaskDetailPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Edit Task State
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState('');

    // Edit state
    const [editingCheckpoint, setEditingCheckpoint] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchTask();
    }, [taskId]);

    const fetchTask = async () => {
        try {
            const res = await api.get(`/tasks/${taskId}`);
            setTask(res.data);
            setEditTitle(res.data.title);
            setEditDescription(res.data.description || '');
            setEditDeadline(res.data.deadline ? new Date(res.data.deadline).toISOString().split('T')[0] : '');
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch task", error);
            setLoading(false);
        }
    };

    const handleCycleProgress = async (checkpointId: string, currentProgress: number) => {
        try {
            // Cycle: 0 -> 25 -> 50 -> 75 -> 100 -> 0
            let nextProgress = currentProgress + 25;
            if (nextProgress > 100) nextProgress = 0;

            // Optimistic update
            if (!task) return;
            const updatedCheckpoints = task.checkpoints.map(cp =>
                cp.id === checkpointId ? { ...cp, progress: nextProgress, isCompleted: nextProgress === 100 } : cp
            );

            // Calculate new overall progress (Average of all checkpoints)
            const totalProgressSum = updatedCheckpoints.reduce((sum, cp) => sum + (cp.progress || 0), 0);
            const newTotalProgress = updatedCheckpoints.length > 0 ? Math.round(totalProgressSum / updatedCheckpoints.length) : 0;

            setTask({ ...task, checkpoints: updatedCheckpoints, progressPercent: newTotalProgress });

            // API Call
            await api.post(`/tasks/${task.id}/checkpoints/${checkpointId}/progress`, {
                progress: nextProgress
            });

            // No need to call main progress API separately if backend handles it, 
            // but Frontend optimistic update needs to show it immediately.
        } catch (error) {
            console.error("Failed to cycle progress", error);
            fetchTask(); // Revert on error
        }
    };

    const handleSaveCheckpoint = async (checkpointId: string) => {
        try {
            await api.put(`/tasks/${task?.id}/checkpoints/${checkpointId}`, {
                title: editValue
            });
            setEditingCheckpoint(null);
            fetchTask();
        } catch (error) {
            console.error("Failed to update checkpoint", error);
        }
    };

    const handleDeleteTask = async () => {
        try {
            await api.delete(`/tasks/${taskId}`);
            navigate('/app/tasks');
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/tasks/${taskId}`, {
                title: editTitle,
                description: editDescription,
                deadline: new Date(editDeadline).toISOString()
            });
            setShowEditModal(false);
            fetchTask();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    if (loading) return <PageLoader />;
    if (!task) return <div style={{ padding: '2rem', color: 'white' }}>Task not found</div>;

    const isCompleted = task.status === 'COMPLETED';
    const progressColor = isCompleted ? '#4CAF50' : '#4F46E5'; // Success green or primary brand color

    // Radius for circular progress
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - ((task.progressPercent || 0) / 100) * circumference;

    return (
        <PageTransition>
            <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
                {/* Back Link */}
                <button
                    onClick={() => navigate('/app/tasks')}
                    style={{
                        background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px',
                        cursor: 'pointer', padding: 0
                    }}
                >
                    <RiArrowLeftLine /> Back to Missions
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>

                    {/* Left Column: Details & Timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* Header Box */}
                        <GlassCard style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                    <div>
                                        {task.dream && (
                                            <div style={{
                                                fontSize: '0.85rem', color: 'var(--color-gold)',
                                                marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                                                {task.dream.title}
                                            </div>
                                        )}
                                        <h1 style={{ fontSize: '2rem', marginBottom: '8px', lineHeight: 1.2 }}>{task.title}</h1>
                                        {task.description && (
                                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{task.description}</p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {/* Actions */}
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <RiEditLine size={20} />
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            style={{ background: 'rgba(255,50,50,0.1)', border: 'none', color: '#ff6b6b', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <RiDeleteBinLine size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                                        <RiTimeLine />
                                        <span>Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <div style={{
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                                        background: isCompleted ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                                        color: isCompleted ? '#66bb6a' : 'white',
                                        border: isCompleted ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {task.status.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Checkpoints Timeline */}
                        <div style={{ position: 'relative', paddingLeft: '16px' }}>
                            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <RiCheckDoubleLine color="#4F46E5" /> Mission Checkpoints
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {task.checkpoints.map((cp, index) => {
                                    const isLast = index === task.checkpoints.length - 1;
                                    const isPast = new Date(cp.targetDate) < new Date() && !cp.isCompleted;

                                    return (
                                        <div key={cp.id} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: isLast ? 0 : '32px' }}>

                                            {/* Timeline Line */}
                                            {!isLast && (
                                                <div style={{
                                                    position: 'absolute', left: '11px', top: '28px', bottom: '0', width: '2px',
                                                    background: cp.isCompleted ? '#4F46E5' : 'rgba(255,255,255,0.1)'
                                                }} />
                                            )}

                                            {/* Circular Progress Icon */}
                                            <div
                                                onClick={() => handleCycleProgress(cp.id, cp.progress || 0)}
                                                style={{
                                                    zIndex: 2, cursor: 'pointer',
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: 'rgba(30,30,40,1)',
                                                    position: 'relative',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {/* Background Track */}
                                                <svg width="32" height="32" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                                                    <circle
                                                        cx="16" cy="16" r="14"
                                                        stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="transparent"
                                                    />
                                                    {/* Progress Fill */}
                                                    <motion.circle
                                                        initial={false}
                                                        animate={{ strokeDashoffset: 88 - (88 * (cp.progress || 0)) / 100 }}
                                                        transition={{ duration: 0.3 }}
                                                        cx="16" cy="16" r="14"
                                                        stroke={cp.progress === 100 ? '#4CAF50' : '#4F46E5'}
                                                        strokeWidth="3" fill="transparent"
                                                        strokeDasharray="88" // 2 * PI * 14
                                                        strokeLinecap="round"
                                                    />
                                                </svg>

                                                {/* Center Text/Icon */}
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', zIndex: 3 }}>
                                                    {cp.progress === 100 ? (
                                                        <RiCheckboxCircleLine color="#4CAF50" size={16} />
                                                    ) : (
                                                        cp.progress > 0 ? cp.progress : ''
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, marginTop: '-2px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    {editingCheckpoint === cp.id ? (
                                                        <div style={{ flex: 1, marginRight: '16px' }}>
                                                            <input
                                                                autoFocus
                                                                className="glass-input"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={() => handleSaveCheckpoint(cp.id)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCheckpoint(cp.id)}
                                                                style={{
                                                                    width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'white'
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => { setEditingCheckpoint(cp.id); setEditValue(cp.title); }}
                                                            style={{
                                                                cursor: 'text',
                                                                textDecoration: cp.isCompleted ? 'line-through' : 'none',
                                                                color: cp.isCompleted ? 'rgba(255,255,255,0.4)' : 'white',
                                                                fontWeight: 400, fontSize: '1.05rem'
                                                            }}
                                                        >
                                                            {cp.title}
                                                        </div>
                                                    )}

                                                    <div style={{ fontSize: '0.85rem', color: cp.isCompleted ? 'rgba(255,255,255,0.3)' : (isPast ? '#ff6b6b' : 'var(--color-text-secondary)') }}>
                                                        {new Date(cp.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Progress */}
                    <div>
                        <GlassCard style={{ padding: '32px', textAlign: 'center', position: 'sticky', top: '24px' }}>
                            <h3 style={{ marginBottom: '24px' }}>Progress Overview</h3>

                            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
                                {/* Background Circle */}
                                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="8"
                                        fill="transparent"
                                        r={radius}
                                        cx="80"
                                        cy="80"
                                    />
                                    {/* Progress Circle */}
                                    <motion.circle
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        stroke={progressColor}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        fill="transparent"
                                        r={radius}
                                        cx="80"
                                        cy="80"
                                        strokeDasharray={circumference}
                                    />
                                </svg>

                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 700 }}>{task.progressPercent}%</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Completed</span>
                                </div>
                            </div>

                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                "Progress reflects what you’ve shared so far."
                            </p>
                        </GlassCard>
                    </div>

                </div>

                {/* Delete Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                            }}
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <GlassCard
                                style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '16px' }}>Delete Mission?</h3>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                                    This will stop reminders for this task. Continue?
                                </p>
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                    <GlowButton variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</GlowButton>
                                    <button
                                        onClick={handleDeleteTask}
                                        style={{
                                            background: '#ff6b6b', color: 'white', border: 'none',
                                            padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Edit Task Modal */}
                <AnimatePresence>
                    {showEditModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                            }}
                            onClick={() => setShowEditModal(false)}
                        >
                            <GlassCard
                                style={{ width: '100%', maxWidth: '500px' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '24px' }}>Edit Mission</h3>
                                <form onSubmit={handleUpdateTask}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Title</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Description</label>
                                        <textarea
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', resize: 'vertical' }}
                                            value={editDescription}
                                            onChange={e => setEditDescription(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Deadline</label>
                                        <input
                                            type="date"
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={editDeadline}
                                            onChange={e => setEditDeadline(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                        <GlowButton type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</GlowButton>
                                        <GlowButton type="submit">Update Mission</GlowButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
};

export default TaskDetailPage;

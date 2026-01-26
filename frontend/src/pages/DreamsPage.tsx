import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiAddLine, RiTimeLine, RiFireLine, RiEditLine, RiDeleteBinLine } from 'react-icons/ri';
import api from '../api/client';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import PageTransition from '../components/PageTransition';
import PageLoader from '../components/PageLoader';

interface Dream {
    id: string;
    title: string;
    description: string;
    motivationStatement: string;
    deadline: string;
    impactScore: number;
}

const DreamsPage: React.FC = () => {
    const [dreams, setDreams] = useState<Dream[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [selectedDream, setSelectedDream] = useState<Dream | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [motivation, setMotivation] = useState('');
    const [deadline, setDeadline] = useState('');
    const [impactScore, setImpactScore] = useState(8);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDreams();
    }, []);

    const fetchDreams = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/dreams');
            setDreams(data.dreams || []);
        } catch (error) {
            console.error("Failed to fetch dreams", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/dreams', {
                title,
                description,
                motivationStatement: motivation,
                deadline: new Date(deadline).toISOString(),
                impactScore: impactScore
            });
            setShowCreate(false);
            resetForm();
            fetchDreams();
        } catch (error) {
            console.error("Failed to create dream", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setMotivation('');
        setDeadline('');
        setImpactScore(8);
        setSelectedDream(null);
    };

    const openEdit = (dream: Dream) => {
        setSelectedDream(dream);
        setTitle(dream.title);
        setDescription(dream.description);
        setMotivation(dream.motivationStatement);
        setDeadline(dream.deadline ? new Date(dream.deadline).toISOString().split('T')[0] : '');
        setImpactScore(dream.impactScore);
        setShowEdit(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDream) return;
        setLoading(true);
        try {
            await api.put(`/dreams/${selectedDream.id}`, {
                title,
                description,
                motivationStatement: motivation,
                deadline: new Date(deadline).toISOString(),
                impactScore: impactScore
            });
            setShowEdit(false);
            resetForm();
            fetchDreams();
        } catch (error) {
            console.error("Failed to update dream", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedDream) return;
        setLoading(true);
        try {
            await api.delete(`/dreams/${selectedDream.id}`);
            setShowDelete(false);
            resetForm();
            fetchDreams();
        } catch (error) {
            console.error("Failed to archive dream", error);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <PageTransition>
            {loading && <PageLoader />}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2>Your Dreams</h2>
                    <GlowButton onClick={() => setShowCreate(true)}>
                        <RiAddLine style={{ marginRight: '8px' }} /> New Dream
                    </GlowButton>
                </div>

                <motion.div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {dreams.map((dream) => (
                        <GlassCard
                            key={dream.id}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
                        >
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(dream); }}
                                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    <RiEditLine />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedDream(dream); setShowDelete(true); }}
                                    style={{ background: 'rgba(255,50,50,0.2)', border: 'none', color: '#ff6b6b', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    <RiDeleteBinLine />
                                </button>
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--color-accent)', paddingRight: '60px' }}>{dream.title}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', flex: 1 }}>{dream.description}</p>

                            <div style={{
                                borderTop: '1px solid var(--glass-border)',
                                paddingTop: '16px',
                                marginTop: 'auto'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-gold)' }}>
                                    <RiFireLine />
                                    <span>"{dream.motivationStatement}"</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                    <RiTimeLine />
                                    <span>{new Date(dream.deadline).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </motion.div>

                {/* Create Modal Overlay */}
                <AnimatePresence>
                    {showCreate && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(0,0,0,0.8)',
                                backdropFilter: 'blur(5px)',
                                zIndex: 1000,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '16px'
                            }}
                            onClick={() => setShowCreate(false)}
                        >
                            <GlassCard
                                style={{ width: '100%', maxWidth: '500px' }}
                                onClick={(e) => e.stopPropagation()}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                            >
                                <h3 style={{ marginBottom: '24px' }}>Declare a New Dream</h3>
                                <form onSubmit={handleCreate}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Title</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="e.g. Run a Marathon"
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Description</label>
                                        <textarea
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', resize: 'vertical' }}
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="What is this dream about?"
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Motivation Statement</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={motivation}
                                            onChange={e => setMotivation(e.target.value)}
                                            placeholder="Why does this matter?"
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Target Date</label>
                                        <input
                                            type="date"
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                            <span>Impact Score</span>
                                            <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{impactScore}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                                            value={impactScore}
                                            onChange={e => setImpactScore(parseInt(e.target.value))}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                            <span>Nice to have</span>
                                            <span>Life-changing</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                        <GlowButton type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</GlowButton>
                                        <GlowButton type="submit">Set This Dream</GlowButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Edit Modal */}
                <AnimatePresence>
                    {showEdit && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                            }}
                            onClick={() => setShowEdit(false)}
                        >
                            <GlassCard
                                style={{ width: '100%', maxWidth: '500px' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '24px' }}>Edit Dream</h3>
                                <form onSubmit={handleUpdate}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Title</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Description</label>
                                        <textarea
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', resize: 'vertical' }}
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Motivation Statement</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={motivation}
                                            onChange={e => setMotivation(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Target Date</label>
                                        <input
                                            type="date"
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                                        <GlowButton type="button" variant="ghost" onClick={() => setShowEdit(false)}>Cancel</GlowButton>
                                        <GlowButton type="submit">Update Dream</GlowButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDelete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 1000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                            }}
                            onClick={() => setShowDelete(false)}
                        >
                            <GlassCard
                                style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '16px' }}>Delete Dream?</h3>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                                    “Dreams are long-term commitments. Are you sure you want to archive this dream?”
                                </p>
                                <p style={{ fontSize: '0.8rem', color: '#ff6b6b', marginBottom: '24px' }}>
                                    This will mark it as FAILED or ARCHIVED.
                                </p>
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                    <GlowButton variant="ghost" onClick={() => setShowDelete(false)}>Cancel</GlowButton>
                                    <button
                                        onClick={confirmDelete}
                                        style={{
                                            background: '#ff6b6b', color: 'white', border: 'none',
                                            padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        Archive Dream
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
};

export default DreamsPage;

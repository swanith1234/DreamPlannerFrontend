import React, { useState } from 'react';
import { RiNotification3Line, RiVolumeUpLine, RiMoonLine } from 'react-icons/ri';
import api from '../api/client';
import GlassCard from '../components/GlassCard';
import PageTransition from '../components/PageTransition';
import PageLoader from '../components/PageLoader';

const SettingsPage: React.FC = () => {
    const [tone, setTone] = useState<'NEUTRAL' | 'LOGICAL' | 'HARSH' | 'POSITIVE' | 'OPTIMISTIC' | 'FEAR'>('NEUTRAL');
    const [notifications, setNotifications] = useState(true);
    const [particles, setParticles] = useState(true);

    // New Preferences
    const [sleepStart, setSleepStart] = useState('23:00');
    const [sleepEnd, setSleepEnd] = useState('07:00');
    const [notificationFrequency, setNotificationFrequency] = useState(60);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Initial load state

    React.useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const { data } = await api.get('/users/preferences');
                if (data) {
                    setTone(data.motivationTone || 'NEUTRAL');
                    setNotificationFrequency(data.notificationFrequency || 60);
                    setSleepStart(data.sleepStart || '23:00');
                    setSleepEnd(data.sleepEnd || '07:00');
                    // quietHours ignored for now
                }
            } catch (error) {
                console.error("Failed to fetch preferences", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPreferences();
    }, []);

    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '48px', height: '24px', borderRadius: '12px',
                background: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
            }}
        >
            <div style={{
                width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '2px', left: checked ? '26px' : '2px',
                transition: 'left 0.3s'
            }} />
        </div>
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/users/preferences', {
                motivationTone: tone,
                notificationFrequency,
                sleepStart,
                sleepEnd,
                quietHours: []
            });
            // Show toast or success
            alert('Settings saved!');
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <PageLoader />;

    return (
        <PageTransition>
            {isSaving && <PageLoader />}
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '32px' }}>System Configuration</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Tone Section */}
                    <GlassCard>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <RiVolumeUpLine style={{ fontSize: '1.5rem', marginRight: '16px', color: 'var(--color-accent)' }} />
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Coach Personality</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>How should the system talk to you?</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {['NEUTRAL', 'LOGICAL', 'HARSH', 'POSITIVE', 'OPTIMISTIC', 'FEAR'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t as any)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px',
                                        border: `1px solid ${tone === t ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`,
                                        background: tone === t ? 'rgba(0, 242, 234, 0.1)' : 'transparent',
                                        color: tone === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        cursor: 'pointer', transition: 'all 0.3s',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {t.toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Notifications Section */}
                    <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <RiNotification3Line style={{ fontSize: '1.5rem', marginRight: '16px', color: 'var(--color-gold)' }} />
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Notifications</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Enable system nudges</p>
                            </div>
                        </div>
                        <Toggle checked={notifications} onChange={setNotifications} />
                    </GlassCard>

                    {/* Schedule Section */}
                    <GlassCard>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <RiMoonLine style={{ fontSize: '1.5rem', marginRight: '16px', color: 'var(--color-accent)' }} />
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Sleep Schedule</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Quiet hours when AI won't disturb you</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Sleep Start</label>
                                <input
                                    type="time"
                                    value={sleepStart}
                                    onChange={(e) => setSleepStart(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', outline: 'none' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Wake Up</label>
                                <input
                                    type="time"
                                    value={sleepEnd}
                                    onChange={(e) => setSleepEnd(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Frequency Section */}
                    <GlassCard>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <RiNotification3Line style={{ fontSize: '1.5rem', marginRight: '16px', color: 'var(--color-gold)' }} />
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Nudge Frequency</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>How often should we check in?</p>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="15"
                            max="240"
                            step="15"
                            value={notificationFrequency}
                            onChange={(e) => setNotificationFrequency(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                        />
                        <div style={{ textAlign: 'right', marginTop: '8px', color: 'var(--color-accent)' }}>
                            Every {notificationFrequency} minutes
                        </div>
                    </GlassCard>

                    {/* Performance Section */}
                    <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <RiMoonLine style={{ fontSize: '1.5rem', marginRight: '16px', color: 'white' }} />
                            <div>
                                <h3 style={{ fontSize: '1.1rem' }}>Visual Effects</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Particles & Animations</p>
                            </div>
                        </div>
                        <Toggle checked={particles} onChange={setParticles} />
                    </GlassCard>

                </div>

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '12px 32px',
                            background: 'var(--color-accent)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>
        </PageTransition>
    );
};

export default SettingsPage;

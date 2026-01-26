import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    RiHome5Line,
    RiHome5Fill,
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

    const navItems = [
        { path: '/app/home', icon: RiHome5Line, activeIcon: RiHome5Fill, label: 'Home' },
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
            <main className={styles.main}>
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
            </nav>
        </div>
    );
};

export default AppShell;

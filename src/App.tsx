import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TourProvider, useTour } from './context/TourContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppShell from './layouts/AppShell';
import AnimatedOnboarding from './components/AnimatedOnboarding';
import './styles/global.css';

import HomePage from './pages/HomePage';
import DreamsPage from './pages/DreamsPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import AssessmentPage from './pages/AssessmentPage';
import RoadmapRedirect from './components/RoadmapRedirect';

// ─── Protected Route ──────────────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

// ─── Animated Routes ──────────────────────────────────────────────────────────

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dreams" element={<DreamsPage />} />
          <Route path="dreams/:dreamId/roadmap" element={<RoadmapPage />} />
          <Route path="roadmap" element={<RoadmapRedirect />} />
          <Route path="assessments/:assessmentId" element={<AssessmentPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

// ─── Onboarding Gate ──────────────────────────────────────────────────────────

/**
 * Renders the AnimatedOnboarding overlay for first-time users.
 * Placed inside TourProvider so it can call completeOnboarding().
 */
const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showOnboarding, completeOnboarding } = useTour();
  return (
    <>
      {children}
      <AnimatePresence>
        {showOnboarding && (
          <AnimatedOnboarding onComplete={completeOnboarding} />
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <OnboardingGate>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </OnboardingGate>
      </TourProvider>
    </AuthProvider>
  );
}

export default App;

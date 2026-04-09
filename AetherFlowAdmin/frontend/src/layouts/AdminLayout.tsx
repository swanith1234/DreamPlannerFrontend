import React, { useEffect } from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, LogOut, Terminal } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const token = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const navItems = [
    { to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/users", icon: <Users size={20} />, label: "Personnel" },
    { to: "/telemetry", icon: <Activity size={20} />, label: "Telemetry" },
    { to: "/console", icon: <Terminal size={20} />, label: "Console" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mr-3 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Activity className="text-cyan-400 w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-widest text-cyan-400 neon-text-cyan">AetherFlow</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`
              }
            >
              {item.icon}
              <span className="font-medium tracking-wide">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium tracking-wide">Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-3 h-3">
              <div className="pulse-dot absolute w-3 h-3 bg-emerald-500 rounded-full"></div>
              <div className="absolute w-2 h-2 bg-emerald-400 rounded-full"></div>
            </div>
            <span className="text-emerald-400 font-mono text-sm tracking-widest neon-text-emerald">
              SYSTEM NOMINAL
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-200">Admin_Prime</div>
              <div className="text-xs text-cyan-500 font-mono">God Mode: Active</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <img src="https://ui-avatars.com/api/?name=Admin+Prime&background=0F172A&color=06B6D4" alt="Admin" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-950 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

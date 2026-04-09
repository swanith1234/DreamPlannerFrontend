import React from 'react';
import { Users, Activity, Target, Zap } from 'lucide-react';

interface MetricsProps {
  metrics?: {
    totalUsers: number;
    online: number;
    passRate: number;
    delta: string;
  };
}

const MetricsGrid: React.FC<MetricsProps> = ({ metrics }) => {
  if (!metrics) return <div className="animate-pulse h-32 bg-slate-800 rounded-xl" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 ml:grid-cols-4 gap-6 mb-8">
      {/* Total Users */}
      <div className="glass-panel p-6 border-l-4 border-l-slate-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Recruits</p>
            <h3 className="text-3xl font-bold mt-2 text-slate-100">{metrics.totalUsers}</h3>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg">
            <Users className="text-slate-400 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-400/80 text-sm font-medium uppercase tracking-wider">Active Stream</p>
            <div className="flex items-center mt-2 space-x-3">
              <h3 className="text-3xl font-bold text-emerald-400 neon-text-emerald">{metrics.online}</h3>
              <div className="relative flex items-center justify-center w-3 h-3">
                <div className="pulse-dot absolute w-3 h-3 bg-emerald-500 rounded-full"></div>
                <div className="absolute w-2 h-2 bg-emerald-400 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Activity className="text-emerald-400 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pass Rate */}
      <div className="glass-panel p-6 border-l-4 border-l-yellow-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-yellow-500/80 text-sm font-medium uppercase tracking-wider border-yellow-500/20">Threshold Rate</p>
            <h3 className="text-3xl font-bold mt-2 text-yellow-500" style={{ textShadow: '0 0 10px rgba(234,179,8,0.3)' }}>
              {metrics.passRate}%
            </h3>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <Target className="text-yellow-500 w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Delta */}
      <div className="glass-panel p-6 border-l-4 border-l-red-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-red-400/80 text-sm font-medium uppercase tracking-wider">Avg Slippage</p>
            <h3 className="text-3xl font-bold mt-2 text-red-500 neon-text-red">
              {metrics.delta}
            </h3>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <Zap className="text-red-500 w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;

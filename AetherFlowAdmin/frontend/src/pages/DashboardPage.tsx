import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MetricsGrid from '../components/MetricsGrid';
import DemographicsChart from '../components/DemographicsChart';
import LiveTerminal from '../components/LiveTerminal';
import UserTable from '../components/UserTable';

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('adminToken');
      
      try {
        const response = await axios.get('http://localhost:4000/api/admin/dashboard-data', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setData(response.data);
        setError('');
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          navigate('/login');
        } else {
          setError('Aether Core Sync Failure [AUTO_RETRY]');
        }
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [navigate]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-slate-100 neon-text-cyan flex items-center">
            Global Telemetry
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">OVERVIEW_MATRIX_v3 // SECTOR_7</p>
        </div>
        
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded font-mono text-sm neon-text-red">
            [ERR] {error}
          </div>
        )}
      </div>

      {/* Top Metrics Row */}
      <MetricsGrid metrics={data?.metrics} />

      {/* Middle Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 h-[400px]">
          <DemographicsChart data={data?.demographics} />
        </div>
        <div className="lg:col-span-2 h-[400px]">
          <LiveTerminal feed={data?.liveFeed} />
        </div>
      </div>

      {/* Bottom Ledger Section */}
      <UserTable users={data?.users} />
      
    </div>
  );
};

export default DashboardPage;

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  target: string;
  progress: number;
  status: string;
  isSlipping: boolean;
}

interface UserTableProps {
  users?: UserData[];
}

const UserTable: React.FC<UserTableProps> = ({ users }) => {
  if (!users) return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;

  return (
    <div className="glass-panel overflow-hidden w-full">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-slate-100 font-bold uppercase tracking-widest font-mono text-sm">
          Active Personnel Ledger
        </h3>
        <button className="text-cyan-400 text-xs uppercase font-mono tracking-wider hover:text-cyan-300">
          [ View Full DB ]
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-xs uppercase font-mono text-slate-400 tracking-wider">
              <th className="py-4 px-6 font-medium">Recruit Identifier</th>
              <th className="py-4 px-6 font-medium">Target Vector</th>
              <th className="py-4 px-6 font-medium min-w-[200px]">Progress Sync</th>
              <th className="py-4 px-6 font-medium">Telemetry Status</th>
              <th className="py-4 px-6 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm border border-slate-700">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-200">{user.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID_00{user.id}</div>
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-6">
                  <span className="px-3 py-1 rounded bg-slate-800/80 text-cyan-400 text-xs border border-cyan-500/20 font-mono block w-max">
                    {user.target}
                  </span>
                </td>
                
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3 w-full max-w-xs">
                    <span className="text-xs font-mono text-slate-400 w-8">{user.progress}%</span>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex-1 border border-slate-700">
                      <div 
                        className={`h-full rounded-full ${user.isSlipping ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                        style={{ width: `${user.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-6">
                  <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide 
                    ${user.isSlipping 
                      ? 'bg-red-500/10 border-red-500/50 text-red-500 neon-text-red' 
                      : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 neon-text-emerald'
                    }`
                  }>
                    {user.isSlipping ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span>{user.status}</span>
                  </div>
                </td>
                
                <td className="py-4 px-6 text-right">
                  <button className="text-slate-500 hover:text-cyan-400 transition-colors bg-slate-800/50 hover:bg-slate-800 p-2 rounded border border-slate-700 hover:border-cyan-500/30">
                    <span className="uppercase text-[10px] font-bold tracking-widest px-2">Inspect</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;

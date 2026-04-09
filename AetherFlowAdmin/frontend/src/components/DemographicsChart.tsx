import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DemographicsChartProps {
  data?: {
    name: string;
    value: number;
    color: string;
  }[];
}

const DemographicsChart: React.FC<DemographicsChartProps> = ({ data }) => {
  if (!data) return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 border-cyan-500/30">
          <p className="text-slate-200 font-mono text-sm">{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 font-mono text-sm border-b border-slate-800 pb-4">
        Sector Demographics
      </h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'ui-monospace, monospace' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DemographicsChart;

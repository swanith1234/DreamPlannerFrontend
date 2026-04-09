import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

interface LiveTerminalProps {
  feed?: string[];
}

const LiveTerminal: React.FC<LiveTerminalProps> = ({ feed }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [feed]);

  if (!feed) return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;

  return (
    <div className="glass-panel p-0 h-full flex flex-col border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] bg-black/80">
      <div className="h-10 border-b border-slate-800 bg-slate-900/80 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 font-mono text-xs font-bold tracking-widest">AETHER_TERMINAL v2.4.1</span>
        </div>
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-slate-800"></div>
          <div className="w-3 h-3 rounded-full bg-slate-800"></div>
          <div className="w-3 h-3 rounded-full bg-slate-800"></div>
        </div>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 p-5 overflow-y-auto font-mono text-sm space-y-2 bg-transparent"
      >
        <div className="text-slate-500 mb-4 opacity-70">
          login as: admin_prime<br/>
          admin_prime@aether_core's password: <br/>
          Last login: Thu Mar 29 11:42:01 2026 from 192.168.1.104<br/>
          [root@aether_core ~]# tail -f /var/log/system_events.log
        </div>
        {feed.map((line, idx) => {
          let coloring = "text-emerald-500";
          if (line.includes("FAILED")) coloring = "text-yellow-500";
          if (line.includes("SYSTEM:") || line.includes("intervention")) coloring = "text-cyan-400";
          
          return (
            <div key={idx} className={`break-words ${coloring}`}>
              {line}
            </div>
          );
        })}
        <div className="text-emerald-500 animate-pulse mt-2">_</div>
      </div>
    </div>
  );
};

export default LiveTerminal;

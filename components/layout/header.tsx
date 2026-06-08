'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Gauge, Fuel } from 'lucide-react';

export function Header() {
  const [time, setTime] = useState('');
  const [uptime, setUptime] = useState('0m 0s');
  const startTime = React.useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString());
      const s = Math.floor((Date.now() - startTime.current) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setUptime(h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 border-b border-white/[0.06] bg-[#06060a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30" id="main-header">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-white/30">
          <Gauge className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">RPM</span>
          <span className="text-xs font-mono font-semibold text-white/60">
            {(2200 + Math.round(Math.sin(Date.now() * 0.001) * 400)).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/30">
          <Fuel className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">SPD</span>
          <span className="text-xs font-mono font-semibold text-white/60">
            {Math.round(65 + Math.sin(Date.now() * 0.0005) * 15)} km/h
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-white/30">
          <span className="text-[10px]">Uptime:</span>
          <span className="text-[10px] font-mono text-white/50">{uptime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/40">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">{time}</span>
        </div>
      </div>
    </header>
  );
}

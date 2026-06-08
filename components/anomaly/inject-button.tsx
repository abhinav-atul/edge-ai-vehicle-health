'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { SENSORS } from '@/lib/engine';

interface InjectButtonProps {
  onInject?: (result: { sensor: string; sensorName: string; faultType: string }) => void;
}

export function InjectButton({ onInject }: InjectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [selectedFault, setSelectedFault] = useState('');

  const handleInject = async () => {
    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (selectedSensor) body.sensor = selectedSensor;
      if (selectedFault) body.faultType = selectedFault;

      const res = await fetch('/api/anomaly/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      onInject?.(data.anomaly);
    } catch (err) {
      console.error('Inject failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" id="inject-anomaly-controls">
      <div className="flex items-center gap-2">
        <button
          onClick={handleInject}
          disabled={loading}
          className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                     border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-semibold
                     hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400/50
                     hover:shadow-[0_0_20px_-5px_rgba(0,212,255,0.3)]
                     active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
          {loading ? 'Injecting...' : 'Inject Anomaly'}
        </button>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className="px-2 py-2 border border-white/10 rounded-lg text-white/40 text-xs
                     hover:border-white/20 hover:text-white/60 transition-all"
        >
          ⚙
        </button>
      </div>

      {showOptions && (
        <div className="absolute bottom-full mb-2 left-0 p-3 bg-[#0d0d14] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[240px]">
          <div className="mb-2">
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Sensor</label>
            <select
              value={selectedSensor}
              onChange={e => setSelectedSensor(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 
                         focus:border-cyan-500/30 focus:outline-none"
            >
              <option value="">Random</option>
              {Object.entries(SENSORS).map(([key, s]) => (
                <option key={key} value={key}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider">Fault Type</label>
            <select
              value={selectedFault}
              onChange={e => setSelectedFault(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 
                         focus:border-cyan-500/30 focus:outline-none"
            >
              <option value="">Random</option>
              <option value="spike">Spike</option>
              <option value="drift">Drift</option>
              <option value="drop">Drop</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

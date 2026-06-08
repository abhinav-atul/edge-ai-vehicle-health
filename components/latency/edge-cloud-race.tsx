'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Zap, Cloud, Cpu, Play } from 'lucide-react';

export function EdgeCloudRace() {
  const [edgeWidth, setEdgeWidth] = useState(0);
  const [cloudWidth, setCloudWidth] = useState(0);
  const [edgeTime, setEdgeTime] = useState('—');
  const [cloudTime, setCloudTime] = useState('—');
  const [speedup, setSpeedup] = useState('—');
  const [racing, setRacing] = useState(false);
  const edgeRef = useRef<NodeJS.Timeout | null>(null);
  const cloudRef = useRef<NodeJS.Timeout | null>(null);

  const runRace = useCallback(() => {
    if (racing) return;
    setRacing(true);
    setEdgeWidth(0);
    setCloudWidth(0);
    setEdgeTime('...');
    setCloudTime('...');
    setSpeedup('—');

    const edgeLat = 1.5 + Math.random() * 2;
    const cloudLat = 120 + Math.random() * 60;

    // Edge finishes almost instantly
    edgeRef.current = setTimeout(() => {
      setEdgeWidth(100);
      setEdgeTime(`${edgeLat.toFixed(1)} ms`);
    }, 50);

    // Cloud takes proportionally longer
    let cloudProgress = 0;
    const cloudStep = () => {
      cloudProgress += 2;
      setCloudWidth(Math.min(cloudProgress, 100));
      if (cloudProgress < 100) {
        cloudRef.current = setTimeout(cloudStep, 30);
      } else {
        setCloudTime(`${cloudLat.toFixed(0)} ms`);
        setSpeedup(`${Math.round(cloudLat / edgeLat)}×`);
        setRacing(false);
      }
    };
    setTimeout(cloudStep, 200);

    return () => {
      if (edgeRef.current) clearTimeout(edgeRef.current);
      if (cloudRef.current) clearTimeout(cloudRef.current);
    };
  }, [racing]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" id="edge-cloud-race">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/80">Edge vs Cloud Latency</h3>
        </div>
        <button
          onClick={runRace}
          disabled={racing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg
                     text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 active:scale-95
                     transition-all disabled:opacity-50"
        >
          <Play className="w-3 h-3" />
          Send Reading
        </button>
      </div>

      <div className="space-y-4">
        {/* Edge Path */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-white/60">Edge Processing</span>
            </div>
            <span className="text-xs font-mono font-semibold text-cyan-400">{edgeTime}</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100 shadow-[0_0_10px_rgba(0,212,255,0.3)]"
              style={{ width: `${Math.max(edgeWidth * 3, edgeWidth > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

        {/* Cloud Path */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs text-white/60">Cloud Processing</span>
            </div>
            <span className="text-xs font-mono font-semibold text-white/50">{cloudTime}</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gray-500 to-gray-600 transition-all duration-75"
              style={{ width: `${cloudWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Speedup */}
      {speedup !== '—' && (
        <div className="mt-4 flex items-center justify-center">
          <span className="text-xs text-white/40">Edge is </span>
          <span className="text-lg font-mono font-bold text-cyan-400 mx-1.5">{speedup}</span>
          <span className="text-xs text-white/40"> faster</span>
        </div>
      )}
    </div>
  );
}

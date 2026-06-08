'use client';

import React, { useEffect, useState } from 'react';

interface HealthGaugeProps {
  score: number;
  size?: number;
}

export function HealthGauge({ score, size = 180 }: HealthGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference * (1 - animatedScore / 100);
  const color = animatedScore >= 80 ? '#10b981' : animatedScore >= 50 ? '#f59e0b' : '#ef4444';
  const glowColor = animatedScore >= 80 ? 'rgba(16,185,129,0.3)' : animatedScore >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';
  const label = animatedScore >= 80 ? 'OPTIMAL' : animatedScore >= 50 ? 'DEGRADED' : 'CRITICAL';

  return (
    <div className="relative flex flex-col items-center" id="health-gauge">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#glow)"
          className="transition-all duration-1000 ease-out"
        />

        {/* Pulsing outer ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 6}
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          className="animate-pulse"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-mono font-bold text-white tabular-nums">
          {Math.round(animatedScore)}
        </span>
        <span className="text-[10px] font-semibold tracking-[0.2em] mt-1" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}

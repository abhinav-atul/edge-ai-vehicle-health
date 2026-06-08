'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RulTable } from '@/components/maintenance/rul-table';
import { PlanGenerator } from '@/components/maintenance/plan-generator';
import { HealthGauge } from '@/components/health/health-gauge';
import { Wrench } from 'lucide-react';

interface RULData {
  name: string;
  daysLeft: number;
  totalDays: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  relatedSensors: string[];
  predictedServiceDate?: string;
  percentRemaining?: number;
}

export default function MaintenancePage() {
  const [components, setComponents] = useState<RULData[]>([]);
  const [healthScore, setHealthScore] = useState(90);

  const fetchData = useCallback(async () => {
    try {
      const [rulRes, healthRes] = await Promise.all([
        fetch('/api/maintenance/rul'),
        fetch('/api/health/score'),
      ]);
      const rulData = await rulRes.json();
      const healthData = await healthRes.json();
      setComponents(rulData.components);
      setHealthScore(healthData.score);
    } catch {
      // API not ready
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const nextService = components.length > 0
    ? Math.min(...components.map(c => c.daysLeft))
    : 0;

  return (
    <div className="space-y-6" id="maintenance-page">
      <div>
        <h1 className="text-lg font-semibold text-white/90 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-400" />
          Predictive Maintenance
        </h1>
        <p className="text-xs text-white/30 mt-0.5">Component lifecycle tracking with AI-powered service scheduling</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center justify-center">
          <HealthGauge score={healthScore} size={140} />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Next Service</span>
          <p className="text-3xl font-mono font-bold text-amber-400 mt-2">{nextService}</p>
          <p className="text-xs text-white/30 mt-1">days until next maintenance</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Critical Components</span>
          <p className="text-3xl font-mono font-bold text-red-400 mt-2">
            {components.filter(c => c.urgency === 'critical').length}
          </p>
          <p className="text-xs text-white/30 mt-1">require immediate attention</p>
        </div>
      </div>

      {/* RUL Table */}
      <RulTable components={components} />

      {/* AI Plan Generator */}
      <PlanGenerator />
    </div>
  );
}

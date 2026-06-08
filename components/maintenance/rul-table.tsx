'use client';

import React from 'react';
import type { RULComponent } from '@/lib/engine';
import { Wrench, Calendar, Shield, AlertTriangle } from 'lucide-react';

interface RulTableProps {
  components: (RULComponent & { predictedServiceDate?: string; percentRemaining?: number })[];
}

export function RulTable({ components }: RulTableProps) {
  const sorted = [...components].sort((a, b) => a.daysLeft - b.daysLeft);

  const urgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-400 border-red-500/20',
      high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      medium: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return styles[urgency] ?? styles.low;
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden" id="rul-table">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <Wrench className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white/80">Predictive Maintenance Schedule</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">Component</th>
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">RUL</th>
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">Health</th>
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">Urgency</th>
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">Confidence</th>
              <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-3 font-semibold">Service Date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(component => {
              const pct = Math.round((component.daysLeft / component.totalDays) * 100);
              const barColor = component.urgency === 'critical' ? 'bg-red-500' : component.urgency === 'high' ? 'bg-amber-500' : component.urgency === 'medium' ? 'bg-cyan-500' : 'bg-emerald-500';
              const serviceDate = component.predictedServiceDate ?? new Date(Date.now() + component.daysLeft * 86400000).toLocaleDateString();

              return (
                <tr key={component.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {component.urgency === 'critical' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-white/30" />
                      )}
                      <span className="text-sm text-white/80">{component.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-mono font-semibold text-white/90">{component.daysLeft}</span>
                    <span className="text-xs text-white/30 ml-1">days</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-white/40">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${urgencyBadge(component.urgency)}`}>
                      {component.urgency}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-white/50">{component.confidence}%</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-white/30" />
                      <span className="text-xs text-white/50">{serviceDate}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

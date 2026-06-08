'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SENSORS } from '@/lib/engine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface AnomalyEvent {
  id: string;
  sensor: string;
  faultType: string;
  zScore: number;
  severity: string;
  duration: number;
  createdAt: string;
}

export function AnomalyHistory() {
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterSensor, setFilterSensor] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (filterSensor) params.set('sensor', filterSensor);
      if (filterSeverity) params.set('severity', filterSeverity);

      const res = await fetch(`/api/anomaly/log?${params}`);
      const data = await res.json();
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // DB not configured
    } finally {
      setLoading(false);
    }
  }, [page, filterSensor, filterSeverity]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Aggregate stats for chart
  const sensorCounts: Record<string, number> = {};
  for (const event of events) {
    sensorCounts[event.sensor] = (sensorCounts[event.sensor] ?? 0) + 1;
  }
  const chartData = Object.entries(sensorCounts).map(([sensor, count]) => ({
    sensor: SENSORS[sensor]?.name ?? sensor,
    count,
    color: SENSORS[sensor]?.color ?? '#666',
  }));

  const avgZScore = events.length > 0
    ? (events.reduce((sum, e) => sum + e.zScore, 0) / events.length).toFixed(1)
    : '0.0';

  const mostAffected = chartData.length > 0
    ? chartData.reduce((max, d) => d.count > max.count ? d : max, chartData[0])?.sensor ?? 'N/A'
    : 'N/A';

  return (
    <div className="space-y-6" id="anomaly-history">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Total Anomalies</span>
          <p className="text-2xl font-mono font-bold text-white mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Avg Z-Score</span>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{avgZScore}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Most Affected</span>
          <p className="text-2xl font-mono font-bold text-cyan-400 mt-1 truncate">{mostAffected}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white/80">Anomalies by Sensor</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="sensor" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/80">Event Log</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            <select
              value={filterSensor}
              onChange={e => { setFilterSensor(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none"
            >
              <option value="">All Sensors</option>
              {Object.entries(SENSORS).map(([key, s]) => (
                <option key={key} value={key}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none"
            >
              <option value="">All Severity</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Timestamp</th>
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Sensor</th>
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Fault</th>
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Z-Score</th>
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Severity</th>
                <th className="text-left text-[10px] text-white/40 uppercase tracking-wider px-5 py-2.5 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-white/20 text-xs">Loading...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-white/20 text-xs">No anomaly events recorded yet. Inject an anomaly to see data here.</td></tr>
              ) : events.map(event => (
                <tr key={event.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-2.5 text-xs text-white/50 font-mono">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-xs text-white/70">{SENSORS[event.sensor]?.name ?? event.sensor}</td>
                  <td className="px-5 py-2.5 text-xs text-white/50 capitalize">{event.faultType}</td>
                  <td className="px-5 py-2.5 text-xs font-mono">
                    <span className={event.zScore > 3.75 ? 'text-red-400' : event.zScore > 2.5 ? 'text-amber-400' : 'text-white/50'}>
                      {event.zScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      event.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-white/50 font-mono">{event.duration}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/30">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded border border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

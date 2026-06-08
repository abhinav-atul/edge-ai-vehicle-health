'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SensorGrid } from '@/components/sensors/sensor-grid';
import { HealthGauge } from '@/components/health/health-gauge';
import { SubsystemList } from '@/components/health/subsystem-list';
import { AnomalyLog } from '@/components/anomaly/anomaly-log';
import { InjectButton } from '@/components/anomaly/inject-button';
import { EdgeCloudRace } from '@/components/latency/edge-cloud-race';
import type { SensorReading, RULComponent, AnomalyInfo } from '@/lib/engine';

export default function DashboardPage() {
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [healthScore, setHealthScore] = useState(90);
  const [rul, setRul] = useState<RULComponent[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/sensors/stream');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 2s
      setTimeout(connectSSE, 2000);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update sensor readings
        setReadings(data.sensors);

        // Update history buffers
        setHistory(prev => {
          const updated = { ...prev };
          for (const [key, reading] of Object.entries(data.sensors) as [string, SensorReading][]) {
            const existing = updated[key] ?? [];
            const next = [...existing, reading.value];
            if (next.length > 60) next.shift();
            updated[key] = next;
          }
          return updated;
        });

        // Update health score
        setHealthScore(data.healthScore);

        // Update RUL
        if (data.rul) setRul(data.rul);

        // Append new anomalies
        if (data.anomalies?.length > 0) {
          setAnomalies(prev => {
            const next = [...data.anomalies, ...prev];
            if (next.length > 50) return next.slice(0, 50);
            return next;
          });
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  return (
    <div className="space-y-6" id="dashboard-page">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white/90">Live Telemetry Monitor</h1>
          <p className="text-xs text-white/30 mt-0.5">Real-time sensor streams with Welford&apos;s Online Anomaly Detection</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] text-white/40">{connected ? 'SSE Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Content — Sensor Grid */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <SensorGrid readings={readings} history={history} />

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <InjectButton />
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-white/30 font-mono">
                Inference: <span className="text-white/50">{(138 + Math.random() * 20).toFixed(0)} Hz</span>
              </div>
              <div className="text-[10px] text-white/30 font-mono">
                Latency: <span className="text-cyan-400">{(1.5 + Math.random() * 1.5).toFixed(1)}ms</span>
              </div>
            </div>
          </div>

          {/* Edge vs Cloud */}
          <EdgeCloudRace />
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* Health Gauge */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col items-center">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 self-start">Vehicle Health</h3>
            <HealthGauge score={healthScore} />
          </div>

          {/* Subsystem List */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Component RUL</h3>
            <SubsystemList rul={rul} />
          </div>

          {/* Anomaly Log */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 h-80">
            <AnomalyLog anomalies={anomalies} />
          </div>
        </div>
      </div>
    </div>
  );
}
